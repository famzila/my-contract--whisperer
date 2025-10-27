
/**
 * Mock contract analysis response for development
 */
export const MOCK_LEASE_DATA = {
  "metadata": {
    "contractType": "Lease Agreement",
    "effectiveDate": "2025-03-01",
    "endDate": "2026-02-28",
    "duration": "12 months",
    "autoRenew": null,
    "jurisdiction": "Oregon, USA",
    "parties": {
      "party1": {
        "name": "Olivia Green",
        "location": "241 Oakwood Drive, Portland, Oregon 97205",
        "role": "Landlord"
      },
      "party2": {
        "name": "James Parker",
        "location": "117 North Street, Portland, Oregon 97205",
        "role": "Tenant"
      }
    },
    "detectedLanguage": "en",
    "analyzedForRole": "tenant"
  },
  "summary": {
    "summary": {
      "keyResponsibilities": [
        "Landlord: Maintain the property (structure, plumbing, electrical, heating, major appliances). Tenant: Keep the property clean and in good condition; notify landlord of repairs; comply with local ordinances and HOA rules.",
        "Tenant: Pay rent on the 1st of each month.  Tenant is liable for damages caused by negligence or misuse of the property. Tenant is responsible for electricity, gas, internet, and cable.",
        "Landlord: Provide water, sewer, and garbage collection.",
        "Tenant: Pay for electricity, gas, internet, and cable.",
        "Tenant:  Maintain the property as a private residence.",
        "Landlord:  Enter the property with 24-hour notice for inspections/maintenance, or in emergencies.",
        "Tenant:  Notify landlord of intent to renew lease 60 days before expiration."
      ],
      "compensation": {
        "baseSalary": null,
        "bonus": null,
        "equity": null,
        "other": null
      },
      "benefits": [],
      "termination": {
        "atWill": null,
        "forCause": "The landlord can terminate the lease for material breach (e.g., nonpayment of rent, damage, violation of terms). Tenant can terminate at the end of the lease term with 30 days' written notice.",
        "severance": null,
        "noticeRequired": "30 days written notice"
      },
      "restrictions": {
        "confidentiality": null,
        "nonCompete": null,
        "nonSolicitation": null,
        "intellectualProperty": null,
        "other": "Tenant is not allowed to sublet the property without the landlord's written consent; guests are limited to 14 consecutive days with written approval; tenant may only keep one pet with landlord's consent and a $300 non-refundable fee."
      }
    }
  },
  "risks": {
    "risks": [
      {
        "title": "Non-Renewal/Early Termination Liability",
        "severity": "high" as const,
        "icon": "alert-triangle" as const,
        "description": "If James Parker wants to move out before the lease expires, he's still responsible for rent until the property is re-rented. This could mean significant financial loss if it takes time to find a new tenant.",
        "impact": "Financial loss due to continued rent obligation, potential difficulty finding a new tenant.",
        "impactOn": "employer" as const
      },
      {
        "title": "Landlord's Entry",
        "severity": "medium" as const,
        "icon": "alert-circle" as const,
        "description": "The landlord can enter the property with 24-hour notice (or without notice in emergencies).  While reasonable, frequent or untimely entries could be disruptive to James Parker's privacy and daily life.",
        "impact": "Disruption to privacy, inconvenience, potential for unexpected interruptions.",
        "impactOn": "employee" as const
      },
      {
        "title": "Late Fee",
        "severity": "medium" as const,
        "icon": "alert-circle" as const,
        "description": "A late fee of $50 is charged if rent is not paid within 5 days.  This can create unexpected expenses if James Parker experiences temporary financial difficulties.",
        "impact": "Unexpected expense, potential financial strain if rent is late.",
        "impactOn": "employee" as const
      },
      {
        "title": "Security Deposit Deductions",
        "severity": "medium" as const,
        "icon": "alert-circle" as const,
        "description": "The landlord can withhold a portion of the $1,800 security deposit for damages or unpaid rent. James Parker needs to carefully document the condition of the property upon move-in and move-out to avoid unwarranted deductions.",
        "impact": "Loss of security deposit, potential disputes over deductions.",
        "impactOn": "employee" as const
      },
      {
        "title": "Pet-Related Damage/Nuisance",
        "severity": "low" as const,
        "icon": "info" as const,
        "description": "James Parker is fully liable for any damage or nuisance caused by his pet.  Even with a pet fee, unexpected pet-related issues could lead to additional expenses.",
        "impact": "Unexpected expenses related to pet damage, potential for lease termination if issues persist.",
        "impactOn": "employee" as const
      }
    ]
  },
  "obligations": {
    "obligations": {
      "party1": [
        {
          "duty": "Maintain the structure, plumbing, electrical, heating, and major appliances in safe working order.",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Property maintenance"
        },
        {
          "duty": "Provide and pay for water, sewer, and garbage collection.",
          "amount": null,
          "frequency": "monthly",
          "startDate": null,
          "duration": null,
          "scope": "Utilities"
        },
        {
          "duty": "Enter the Premises with twenty-four (24) hours' notice for inspection, maintenance, or to show the property to prospective tenants or buyers.",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Property inspection/showings"
        },
        {
          "duty": "Enter the Premises without notice to prevent damage or injury (emergency only)",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Emergency situations"
        }
      ],
      "party2": [
        {
          "duty": "Pay rent of One Thousand Eight Hundred Dollars ($1,800) due on the first (1st) day of each calendar month.",
          "amount": 1800,
          "frequency": "monthly",
          "startDate": "2025-03-01",
          "duration": null,
          "scope": "Monthly payment"
        },
        {
          "duty": "Pay late fee of fifty dollars ($50) if rent is not received within five (5) days of the due date.",
          "amount": 50,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Late payment penalty"
        },
        {
          "duty": "Keep the Premises clean, sanitary, and in good condition.",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Property upkeep"
        },
        {
          "duty": "Promptly notify Landlord of any needed repairs.",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Repair requests"
        },
        {
          "duty": "Comply with all local ordinances, building codes, and homeowner association regulations.",
          "amount": null,
          "frequency": null,
          "startDate": null,
          "duration": null,
          "scope": "Legal compliance"
        }
      ]
    }
  },
  "omissions": {
    "omissions": [
      {
        "item": "Maintenance Schedule & Responsibilities (Specifics)",
        "impact": "Lack of a detailed maintenance schedule leaves ambiguity about who is responsible for what repairs and preventative maintenance.  This can lead to disagreements and delayed repairs.",
        "priority": "high" as const
      },
      {
        "item": "Landlord Responsibilities for Habitability",
        "impact": "Oregon law requires landlords to maintain uninhabitable conditions. The agreement doesn't explicitly state the landlord's responsibility for maintaining habitable conditions, potentially leaving the Tenant vulnerable.",
        "priority": "high" as const
      },
      {
        "item": "Insurance Requirements",
        "impact": "The agreement does not specify insurance requirements for either party.  Tenant's personal property is not adequately protected, and landlord's liability is unclear.",
        "priority": "medium" as const
      }
    ],
    "questions": [
      "What is the landlord's preferred method for reporting maintenance requests, and what is the typical response time?",
      "What specific repairs are covered under the landlord's responsibility, and what is the process for requesting those repairs?",
      "What type of insurance does the landlord carry on the property?",
      "What are the rules regarding noise levels and quiet enjoyment of the property, and how will disputes be handled?",
      "Is there a specific process for requesting and approving subletting, and what requirements are placed on subtenants?"
    ]
  },
  "translatedAt": "2025-10-16T07:59:27.168Z"
};

export const MOCK_ONBOARDING_STATE = {
  currentStep: 'complete',
  isValidContract: true,
  validationError: null,
  documentType: 'Lease Agreement',
  detectedLanguage: 'en',
  selectedOutputLanguage: 'en',
  userPreferredLanguage: 'en',
  detectedParties: {
    confidence: 'high' as const,
    contractType: 'bilateral' as const,
    parties: {
      party1: {
        name: 'Olivia Green',
        role: 'Landlord',
        location: '241 Oakwood Drive, Portland, Oregon 97205'
      },
      party2: {
        name: 'James Parker',
        role: 'Tenant',
        location: '117 North Street, Portland, Oregon 97205'
      }
    }
  },
  selectedRole: 'tenant',
  pendingContractText: 'Mock lease agreement content for design purposes...',
  canProceed: true,
  isProcessing: false,
  error: null,
};
export const MOCK_CONTRACT =  {
  id: 'mock-lease-001',
  text: 'Mock lease agreement content for design purposes...',
  fileName: 'Sample Lease Agreement.pdf',
  fileSize: 245760,
  fileType: 'application/pdf',
  uploadedAt: new Date(),
  wordCount: 1250,
  estimatedReadingTime: 5,
};