/**
 * Party Extraction Service
 * Uses NER (Named Entity Recognition) + rule-based inference to extract parties from contracts
 */
import { Injectable, inject } from '@angular/core';
import { PromptService } from './ai/prompt.service';
import type { PartyDetectionResult, DetectedParty } from '../stores/onboarding.store';

/**
 * Raw extraction result from AI
 */
interface RawExtractionResult {
  parties: Array<{
    name: string;
    type: 'organization' | 'person';
    role?: string;
    location?: string;
  }>;
  contractType: string;
  confidence: number;
}

@Injectable({
  providedIn: 'root',
})
export class PartyExtractionService {
  private promptService = inject(PromptService);

  /**
   * Extract parties from contract text
   */
  async extractParties(contractText: string): Promise<PartyDetectionResult> {
    // Try AI extraction first
    const aiResult = await this.aiExtraction(contractText);
    
    // Check if AI result is high confidence (not low confidence string)
    if (aiResult && aiResult.confidence !== 'low') {
      return aiResult;
    }
    
    // Fallback to rule-based extraction
    console.warn('⚠️ AI extraction confidence low, using rule-based fallback');
    return this.ruleBasedExtraction(contractText);
  }

  /**
   * AI-powered party extraction (using Prompt API)
   */
  private async aiExtraction(contractText: string): Promise<PartyDetectionResult | null> {
    try {
      const isAvailable = await this.promptService.isAvailable();
      
      if (!isAvailable) {
        console.warn('⚠️ Prompt API not available, using rule-based extraction');
        return null;
      }

      // Create extraction session
      const session = await this.promptService.createSession({
        initialPrompts: [
          {
            role: 'system',
            content: `You are a legal document analyzer specialized in Named Entity Recognition (NER).

Extract parties from contracts and identify their roles.

Respond ONLY with JSON (no markdown, no explanation):
{
  "parties": [
    {
      "name": "Company or Person Name",
      "type": "organization" | "person",
      "role": "Employer" | "Employee" | "Landlord" | "Tenant" | "Client" | "Contractor" | "Partner",
      "location": "City, State/Country (if found)"
    }
  ],
  "contractType": "employment" | "rental" | "service" | "nda" | "partnership" | "other",
  "confidence": 0-100
}

Rules:
- Extract exactly 2 parties for bilateral contracts
- Identify relationship (employer-employee, landlord-tenant, client-contractor)
- Extract addresses if present
- Set confidence based on clarity of party information`,
          },
        ],
      });

      // Extract from first 3000 characters (enough to find parties)
      const sampleText = contractText.substring(0, 3000);
      const prompt = `Extract parties from this contract:\n\n${sampleText}`;
      
      const response = await session.prompt(prompt);
      session.destroy();
      
      // Parse JSON response
      const cleaned = this.cleanJsonResponse(response);
      const result: RawExtractionResult = JSON.parse(cleaned);
      
      // Transform to PartyDetectionResult
      return this.transformAIResult(result);
    } catch (error) {
      console.error('❌ AI extraction failed:', error);
      return null;
    }
  }

  /**
   * Rule-based party extraction (fallback)
   */
  private ruleBasedExtraction(contractText: string): PartyDetectionResult {
    const lowerText = contractText.toLowerCase();
    
    // Enhanced patterns for parties
    const patterns = {
      // "Between X and Y" - most common pattern
      betweenPattern: /between\s+([^,]+?)\s*(?:,\s*(?:a|an)\s+[^,]+?)?\s+\(['""]?(?:hereinafter|hereafter)?\s*(?:referred to as)?\s*['""]?([^'"")]+)['""]?\)?\s+and\s+([^,]+?)\s*(?:,\s*(?:a|an)\s+[^,]+?)?\s+\(['""]?(?:hereinafter|hereafter)?\s*(?:referred to as)?\s*['""]?([^'"")]+)['""]?\)?/i,
      
      // "This Agreement is made between X and Y"
      agreementPattern: /(?:this\s+)?(?:agreement|contract)\s+(?:is\s+)?(?:made\s+)?(?:and\s+entered\s+)?(?:into\s+)?between\s+([^,]+?)\s+(?:and|&)\s+([^,]+?)(?:\s+on|\s+as\s+of|\s+effective)/i,
      
      // Employer/Employee pattern
      employmentPattern: /(?:employer|company)[\s:]+([^,\n]+).*?(?:employee|worker)[\s:]+([^,\n]+)/is,
      
      // Landlord/Tenant pattern
      rentalPattern: /(?:landlord|lessor)[\s:]+([^,\n]+).*?(?:tenant|lessee)[\s:]+([^,\n]+)/is,
      
      // Client/Contractor pattern
      servicePattern: /(?:client|customer)[\s:]+([^,\n]+).*?(?:contractor|service provider|freelancer)[\s:]+([^,\n]+)/is,
      
      // Simple "X and Y" pattern
      simplePattern: /([A-Z][^,\n]+?)\s+(?:and|&)\s+([A-Z][^,\n]+?)(?:\s+on|\s+as\s+of|\s+effective|\s+hereby)/i,
      
      // Party definitions
      partyDefinitionPattern: /(?:party|parties)[\s:]+([^,\n]+).*?(?:party|parties)[\s:]+([^,\n]+)/is,
    };
    
    // Try each pattern
    let match = patterns.betweenPattern.exec(contractText);
    if (match) {
      return {
        confidence: 'high',
        parties: {
          party1: {
            name: match[1].trim(),
            role: this.inferRole(match[2] || match[1], lowerText, 'first'),
          },
          party2: {
            name: match[3].trim(),
            role: this.inferRole(match[4] || match[3], lowerText, 'second'),
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.agreementPattern.exec(contractText);
    if (match) {
      return {
        confidence: 'medium',
        parties: {
          party1: {
            name: match[1].trim(),
            role: this.inferRole(match[1], lowerText, 'first'),
          },
          party2: {
            name: match[2].trim(),
            role: this.inferRole(match[2], lowerText, 'second'),
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.employmentPattern.exec(contractText);
    if (match) {
      return {
        confidence: 'high',
        parties: {
          party1: {
            name: match[1].trim(),
            role: 'Employer',
          },
          party2: {
            name: match[2].trim(),
            role: 'Employee',
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.rentalPattern.exec(contractText);
    if (match) {
      return {
        confidence: 'high',
        parties: {
          party1: {
            name: match[1].trim(),
            role: 'Landlord',
          },
          party2: {
            name: match[2].trim(),
            role: 'Tenant',
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.servicePattern.exec(contractText);
    if (match) {
      return {
        confidence: 'high',
        parties: {
          party1: {
            name: match[1].trim(),
            role: 'Client',
          },
          party2: {
            name: match[2].trim(),
            role: 'Contractor',
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.simplePattern.exec(contractText);
    if (match) {
      return {
        confidence: 'medium',
        parties: {
          party1: {
            name: match[1].trim(),
            role: this.inferRole(match[1], lowerText, 'first'),
          },
          party2: {
            name: match[2].trim(),
            role: this.inferRole(match[2], lowerText, 'second'),
          },
        },
        contractType: 'bilateral',
      };
    }
    
    match = patterns.partyDefinitionPattern.exec(contractText);
    if (match) {
      return {
        confidence: 'medium',
        parties: {
          party1: {
            name: match[1].trim(),
            role: this.inferRole(match[1], lowerText, 'first'),
          },
          party2: {
            name: match[2].trim(),
            role: this.inferRole(match[2], lowerText, 'second'),
          },
        },
        contractType: 'bilateral',
      };
    }
    
    // No clear parties found
    return {
      confidence: 'low',
      parties: null,
      contractType: 'bilateral',
    };
  }

  /**
   * Infer role from context
   */
  private inferRole(partyText: string, fullText: string, position: 'first' | 'second'): string {
    const lowerParty = partyText.toLowerCase();
    const lowerFull = fullText.toLowerCase();
    
    // Check for explicit role indicators in the party text itself
    if (this.containsKeywords(lowerParty, ['employer', 'company', 'corporation'])) {
      return 'Employer';
    }
    if (this.containsKeywords(lowerParty, ['employee', 'worker', 'staff'])) {
      return 'Employee';
    }
    if (this.containsKeywords(lowerParty, ['landlord', 'lessor', 'owner'])) {
      return 'Landlord';
    }
    if (this.containsKeywords(lowerParty, ['tenant', 'lessee', 'renter'])) {
      return 'Tenant';
    }
    if (this.containsKeywords(lowerParty, ['client', 'customer', 'buyer'])) {
      return 'Client';
    }
    if (this.containsKeywords(lowerParty, ['contractor', 'freelancer', 'service provider'])) {
      return 'Contractor';
    }
    
    // Fall back to context-based inference
    if (this.isCompany(lowerParty)) {
      return this.getCompanyRole(lowerFull, position);
    } else {
      return this.getPersonRole(lowerFull, position);
    }
  }

  private isCompany(partyText: string): boolean {
    const companyKeywords = ['inc', 'corp', 'llc', 'ltd', 'company', 'corporation', 'enterprises', 'group', 'holdings'];
    return companyKeywords.some(keyword => partyText.includes(keyword));
  }

  private getCompanyRole(fullText: string, position: 'first' | 'second'): string {
    if (this.containsKeywords(fullText, ['employment', 'employee', 'hire', 'work', 'job'])) {
      return 'Employer';
    }
    if (this.containsKeywords(fullText, ['rental', 'lease', 'rent', 'property', 'apartment', 'house'])) {
      return position === 'first' ? 'Landlord' : 'Tenant';
    }
    if (this.containsKeywords(fullText, ['service', 'contractor', 'freelance', 'consulting', 'project'])) {
      return 'Client';
    }
    if (this.containsKeywords(fullText, ['partnership', 'partner', 'joint venture'])) {
      return 'Partner';
    }
    return position === 'first' ? 'Party 1' : 'Party 2';
  }

  private getPersonRole(fullText: string, position: 'first' | 'second'): string {
    if (this.containsKeywords(fullText, ['employment', 'employee', 'hire', 'work', 'job'])) {
      return 'Employee';
    }
    if (this.containsKeywords(fullText, ['rental', 'lease', 'rent', 'property', 'apartment', 'house'])) {
      return 'Tenant';
    }
    if (this.containsKeywords(fullText, ['service', 'contractor', 'freelance', 'consulting', 'project'])) {
      return 'Contractor';
    }
    if (this.containsKeywords(fullText, ['partnership', 'partner', 'joint venture'])) {
      return 'Partner';
    }
    return 'Unknown';
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Transform AI result to PartyDetectionResult
   */
  private transformAIResult(result: RawExtractionResult): PartyDetectionResult {
    if (!result.parties || result.parties.length < 2) {
      return {
        confidence: 'low',
        parties: null,
        contractType: result.parties && result.parties.length > 2 ? 'multilateral' : 'bilateral',
      };
    }
    
    // Handle multilateral contracts (more than 2 parties)
    if (result.parties.length > 2) {
      return {
        confidence: 'medium',
        parties: null, // We don't handle 3+ parties in the selector yet
        contractType: 'multilateral',
      };
    }
    
    // Bilateral contract (2 parties)
    const [party1Raw, party2Raw] = result.parties;
    
    const party1: DetectedParty = {
      name: party1Raw.name,
      role: party1Raw.role || 'Party 1',
      location: party1Raw.location,
    };
    
    const party2: DetectedParty = {
      name: party2Raw.name,
      role: party2Raw.role || 'Party 2',
      location: party2Raw.location,
    };
    
    // Convert numeric confidence to string enum
    const confidenceNum = Number(result.confidence);
    const confidence: 'high' | 'medium' | 'low' = 
      confidenceNum >= 80 ? 'high' :
      confidenceNum >= 60 ? 'medium' : 'low';
    
    return {
      confidence,
      parties: { party1, party2 },
      contractType: 'bilateral',
    };
  }

  /**
   * Clean JSON response (remove markdown code blocks if present)
   */
  private cleanJsonResponse(response: string): string {
    let cleaned = response.trim();
    
    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    return cleaned.trim();
  }
}

