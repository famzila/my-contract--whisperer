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
  description: "Generate a comprehensive contract summary (NO duplicate info with metadata)",
  properties: {
    summary: {
      type: "object",
      properties: {
        // REMOVED: parties (duplicate with metadata.parties)
        // REMOVED: role (duplicate with metadata.detectedRole)
        
        keyResponsibilities: {
          type: "array",
          items: { type: "string" },
          description: "Main duties and responsibilities (3-5 key items)",
          minItems: 1
        },
        compensation: {
          type: "object",
          properties: {
            baseSalary: { 
              type: ["number", "null"],
              description: "Annual base salary as number (e.g., 150000)" 
            },
            bonus: { 
              type: ["string", "null"],
              description: "Bonus structure (e.g., 'Up to 20% performance-based')" 
            },
            equity: { 
              type: ["string", "null"],
              description: "Stock/equity details (e.g., '0.5% vesting over 4 years')" 
            },
            other: { 
              type: ["string", "null"],
              description: "Other compensation" 
            }
          }
        },
        benefits: {
          type: "array",
          items: { type: "string" },
          description: "Benefits provided (e.g., 'Health insurance', '401k match')"
        },
        termination: {
          type: "object",
          properties: {
            atWill: { 
              type: ["string", "null"],
              description: "At-will employment details" 
            },
            forCause: { 
              type: ["string", "null"],
              description: "For-cause termination conditions" 
            },
            severance: { 
              type: ["string", "null"],
              description: "Severance package details" 
            },
            noticeRequired: { 
              type: ["string", "null"],
              description: "Notice period required (e.g., '30 days')" 
            }
          }
        },
        restrictions: {
          type: "object",
          properties: {
            confidentiality: { 
              type: ["string", "null"],
              description: "Confidentiality obligations" 
            },
            nonCompete: { 
              type: ["string", "null"],
              description: "Non-compete clause details (duration, scope)" 
            },
            nonSolicitation: { 
              type: ["string", "null"],
              description: "Non-solicitation restrictions" 
            },
            intellectualProperty: { 
              type: ["string", "null"],
              description: "IP assignment and ownership terms" 
            },
            other: { 
              type: ["string", "null"],
              description: "Other restrictions" 
            }
          }
        }
      },
      required: ["keyResponsibilities", "compensation", "benefits", "termination", "restrictions"]
    }
  },
  required: ["summary"],
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
  // NEW: Quick overview from Summarizer API (optional)
  quickTake?: string;
  
  // Structured details from Prompt API (NO duplicates with metadata)
  summary: {
    // REMOVED: parties (duplicate with metadata.parties)
    // REMOVED: role (duplicate with metadata.detectedRole)
    
    keyResponsibilities: string[]; // Renamed from 'responsibilities'
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
      noticeRequired?: string | null; // NEW: Important detail
    };
    restrictions: {
      confidentiality?: string | null;
      nonCompete?: string | null;
      nonSolicitation?: string | null;
      intellectualProperty?: string | null; // NEW: IP assignment
      other?: string | null;
    };
  };
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

