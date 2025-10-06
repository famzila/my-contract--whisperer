# 🌍 Translation Feature Implementation Plan

**Feature**: Language Mismatch Handling with Smart Translation  
**Strategy**: **Translate OUTPUT, Not Contract** (Option B from SPECS.md)  
**Date**: October 5, 2025

---

## 📋 Executive Summary

### **The Problem**
User uploads a contract in **English**, but their app language is **Arabic**. Should we:
- Translate the contract before analysis? ❌ (Loses legal nuance)
- Translate the analysis output? ✅ **YES - This approach**
- Show both languages? ❌ (Cluttered UX)

### **Our Solution: Translate Analysis OUTPUT**

```
┌─────────────────────────────────────────────────┐
│  User uploads English contract                  │
│  User prefers Arabic UI                         │
└─────────────┬───────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────┐
│  1️⃣ DETECT: Contract is in English              │
└─────────────┬───────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────┐
│  2️⃣ MODAL: "Contract in English, analyze in     │
│     Arabic or English?"                         │
│     [Analyze in Arabic] [Keep English]          │
└─────────────┬───────────────────────────────────┘
              │
              ↓ User selects "Analyze in Arabic"
┌─────────────────────────────────────────────────┐
│  3️⃣ ANALYZE: AI processes English contract      │
│     (preserves legal accuracy)                  │
└─────────────┬───────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────┐
│  4️⃣ TRANSLATE: Convert AI output to Arabic      │
│     - Risks → مخاطر                              │
│     - Obligations → التزامات                     │
│     - Questions → أسئلة                          │
└─────────────┬───────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────┐
│  5️⃣ DISPLAY: Show analysis in Arabic            │
│     💡 Badge: "Analyzed from English"           │
│     🔍 Button: "Show Original English"          │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Key Principles

### ✅ **What We DO**
1. ✅ Preserve legal accuracy by analyzing in original language
2. ✅ Show results in user's preferred language
3. ✅ Provide "Show Original" option for reference
4. ✅ Cache translations for performance
5. ✅ Separate app UI language from analysis output language

### ❌ **What We DON'T Do**
1. ❌ Translate the contract before analysis (loses nuance)
2. ❌ Show both languages simultaneously (cluttered)
3. ❌ Force user to use contract's language (bad UX)
4. ❌ Hide the fact that translation happened (transparency)

---

## 🏗️ Architecture Overview

### **Data Flow**

```typescript
┌─────────────────────────────────────────────────────────┐
│                     USER UPLOADS                         │
│              📄 English Contract                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│           LANGUAGE DETECTION SERVICE                     │
│   detectLanguage(text) → "en"                           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│              ONBOARDING STORE                            │
│   - detectedLanguage: "en"                              │
│   - userPreferredLanguage: "ar" (from LanguageStore)    │
│   - selectedLanguage: null (user hasn't chosen yet)     │
│                                                          │
│   computed: needsLanguageSelection()                    │
│   → TRUE if "en" !== "ar"                               │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│         LANGUAGE SELECTION MODAL                         │
│   "Contract is in English. Analyze in:"                 │
│   [🇸🇦 Arabic - Recommended] [🇬🇧 English - Original]   │
│                                                          │
│   User clicks: "Arabic"                                 │
│   → onboardingStore.setSelectedLanguage('ar')           │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│            CONTRACT ANALYSIS SERVICE                     │
│   analyzeContract(text, context)                        │
│   context = {                                           │
│     contractLanguage: "en",                             │
│     userPreferredLanguage: "ar",                        │
│     userRole: "employee",                               │
│     analyzedInLanguage: "ar"  ← User's choice           │
│   }                                                     │
│                                                          │
│   1️⃣ AI analyzes in English (original)                  │
│   2️⃣ Returns JSON analysis in English                   │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│         TRANSLATION ORCHESTRATOR                         │
│   translateAnalysisOutput(analysis, "en", "ar")         │
│                                                          │
│   Translates:                                           │
│   - risks[].title                                       │
│   - risks[].description                                 │
│   - obligations[].duty                                  │
│   - questions[]                                         │
│   - omissions[].item                                    │
│   - summary.fromYourPerspective                         │
│                                                          │
│   Preserves (no translation):                           │
│   - metadata.parties.*.name                             │
│   - metadata.effectiveDate                              │
│   - numbers, dates, legal terms                         │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ↓
┌─────────────────────────────────────────────────────────┐
│           ANALYSIS DASHBOARD                             │
│   Displays:                                             │
│   - Arabic analysis (translated)                        │
│   - Badge: "📝 Analyzed from English"                   │
│   - Button: "🔍 Show Original English" (toggle)         │
│   - Original stored in analysis.originalSummary         │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Phase 1: Data Model Updates (Day 1)

### **1.1 Update `AnalysisContext` Model**

**File**: `src/app/core/models/analysis-context.model.ts`

```typescript
export interface AnalysisContext {
  // The language detected in the contract document itself
  contractLanguage: string;  // e.g., "en"
  
  // The user's preferred UI language (from LanguageStore)
  userPreferredLanguage: string;  // e.g., "ar"
  
  // 👇 NEW: The language user chose for analysis output
  analyzedInLanguage: string;  // e.g., "ar" or "en"
  
  // The role the user has selected for the analysis
  userRole: UserRole;
  
  // The parties detected in the contract, if any
  detectedParties?: {
    party1: DetectedParty;
    party2: DetectedParty;
  };
  
  // Optional: Jurisdiction detected from the contract
  jurisdiction?: string | null;
  
  // Optional: Indicates if the contract involves parties from different countries
  isCrossBorder?: boolean;
  
  // Optional: Detected industry of the contract
  industry?: string | null;
}
```

### **1.2 Update `ContractAnalysis` Model**

**File**: `src/app/core/models/contract.model.ts`

```typescript
export interface ContractAnalysis {
  id: string;
  summary: string | AIAnalysisResponse;  // Current summary (may be translated)
  originalSummary?: string | AIAnalysisResponse;  // 👈 NEW: Original (untranslated)
  clauses: ContractClause[];
  riskScore: number;
  obligations: Obligation[];
  omissions?: Omission[];
  questions?: string[];
  analyzedAt: Date;
  
  // Metadata
  metadata?: ContractMetadata;
  contextWarnings?: ContextWarning[];
  disclaimer?: string;
  
  // 👇 NEW: Translation metadata
  translationInfo?: {
    wasTranslated: boolean;
    sourceLanguage: string;  // e.g., "en"
    targetLanguage: string;  // e.g., "ar"
    translatedAt?: Date;
  };
}
```

### **1.3 Update `AIAnalysisResponse` Model**

**File**: `src/app/core/models/ai-analysis.model.ts`

```typescript
export interface ContractMetadata {
  contractType: string;
  effectiveDate: string | null;
  endDate: string | null;
  duration: string | null;
  autoRenew: boolean | null;
  jurisdiction: string | null;
  parties: {
    party1: Party;
    party2: Party;
  };
  
  // 👇 These fields already exist, just documenting
  detectedLanguage: string;         // Contract's original language
  analyzedForRole: string;          // Which role analysis is tailored for
  analyzedInLanguage: string;       // Language of analysis output (NEW: will be used)
}
```

---

## 📦 Phase 2: Translation Orchestrator Service (Day 2)

### **2.1 Create Translation Orchestrator**

**File**: `src/app/core/services/translation-orchestrator.service.ts` (NEW)

```typescript
import { Injectable, inject } from '@angular/core';
import { TranslatorService } from './ai/translator.service';
import type { AIAnalysisResponse, ContractAnalysis } from '../models';

/**
 * Translation Orchestrator Service
 * 
 * Handles intelligent translation of analysis outputs.
 * Translates human-readable text while preserving:
 * - Legal terminology accuracy
 * - Party names
 * - Dates and numbers
 * - Technical terms
 */
@Injectable({
  providedIn: 'root',
})
export class TranslationOrchestratorService {
  private translator = inject(TranslatorService);
  
  /**
   * Translate entire analysis output
   */
  async translateAnalysis(
    analysis: AIAnalysisResponse,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<AIAnalysisResponse> {
    console.log(`🌍 [Translation] Translating analysis: ${sourceLanguage} → ${targetLanguage}`);
    
    // If same language, return as-is
    if (sourceLanguage === targetLanguage) {
      return analysis;
    }
    
    // Translate in parallel for performance
    const [
      translatedRisks,
      translatedObligations,
      translatedOmissions,
      translatedQuestions,
      translatedSummary,
    ] = await Promise.all([
      this.translateRisks(analysis.risks, sourceLanguage, targetLanguage),
      this.translateObligations(analysis.obligations, sourceLanguage, targetLanguage),
      this.translateOmissions(analysis.omissions, sourceLanguage, targetLanguage),
      this.translateQuestions(analysis.questions, sourceLanguage, targetLanguage),
      this.translateSummary(analysis.summary, sourceLanguage, targetLanguage),
    ]);
    
    // Return translated analysis
    return {
      ...analysis,
      risks: translatedRisks,
      obligations: translatedObligations,
      omissions: translatedOmissions,
      questions: translatedQuestions,
      summary: translatedSummary,
      metadata: {
        ...analysis.metadata,
        analyzedInLanguage: targetLanguage,  // Update metadata
      },
    };
  }
  
  /**
   * Translate risks array
   */
  private async translateRisks(
    risks: RiskFlag[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<RiskFlag[]> {
    return Promise.all(
      risks.map(async (risk) => ({
        ...risk,
        title: await this.translator.translate(risk.title, sourceLanguage, targetLanguage),
        description: await this.translator.translate(risk.description, sourceLanguage, targetLanguage),
        // Preserve: severity, emoji, impactOn (no translation needed)
      }))
    );
  }
  
  /**
   * Translate obligations
   */
  private async translateObligations(
    obligations: Obligations,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Obligations> {
    const [yours, theirs] = await Promise.all([
      Promise.all(
        obligations.yours.map(async (obl) => ({
          ...obl,
          duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
          scope: obl.scope
            ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
            : null,
          // Preserve: amount, frequency, startDate, duration (numbers/dates)
        }))
      ),
      Promise.all(
        obligations.theirs.map(async (obl) => ({
          ...obl,
          duty: await this.translator.translate(obl.duty, sourceLanguage, targetLanguage),
          scope: obl.scope
            ? await this.translator.translate(obl.scope, sourceLanguage, targetLanguage)
            : null,
        }))
      ),
    ]);
    
    return { yours, theirs };
  }
  
  /**
   * Translate omissions
   */
  private async translateOmissions(
    omissions: Omission[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<Omission[]> {
    return Promise.all(
      omissions.map(async (omission) => ({
        ...omission,
        item: await this.translator.translate(omission.item, sourceLanguage, targetLanguage),
        impact: await this.translator.translate(omission.impact, sourceLanguage, targetLanguage),
        // Preserve: priority (no translation needed)
      }))
    );
  }
  
  /**
   * Translate questions array
   */
  private async translateQuestions(
    questions: string[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<string[]> {
    return Promise.all(
      questions.map((q) => this.translator.translate(q, sourceLanguage, targetLanguage))
    );
  }
  
  /**
   * Translate summary
   */
  private async translateSummary(
    summary: ContractSummary,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<ContractSummary> {
    const [
      parties,
      role,
      responsibilities,
      benefits,
      fromYourPerspective,
      keyBenefits,
      keyConcerns,
    ] = await Promise.all([
      this.translator.translate(summary.parties, sourceLanguage, targetLanguage),
      this.translator.translate(summary.role, sourceLanguage, targetLanguage),
      Promise.all(summary.responsibilities.map((r) => this.translator.translate(r, sourceLanguage, targetLanguage))),
      Promise.all(summary.benefits.map((b) => this.translator.translate(b, sourceLanguage, targetLanguage))),
      summary.fromYourPerspective
        ? this.translator.translate(summary.fromYourPerspective, sourceLanguage, targetLanguage)
        : undefined,
      summary.keyBenefits
        ? Promise.all(summary.keyBenefits.map((k) => this.translator.translate(k, sourceLanguage, targetLanguage)))
        : undefined,
      summary.keyConcerns
        ? Promise.all(summary.keyConcerns.map((k) => this.translator.translate(k, sourceLanguage, targetLanguage)))
        : undefined,
    ]);
    
    return {
      ...summary,
      parties,
      role,
      responsibilities,
      benefits,
      fromYourPerspective,
      keyBenefits,
      keyConcerns,
      // Preserve: compensation (numbers), termination, restrictions (legal terms)
    };
  }
  
  /**
   * Check if translation is needed
   */
  needsTranslation(sourceLanguage: string, targetLanguage: string): boolean {
    return sourceLanguage !== targetLanguage;
  }
}
```

---

## 📦 Phase 3: Update Language Selection Modal (Day 3)

### **3.1 Enhance Language Selection Modal**

**File**: `src/app/shared/components/language-selector-modal/language-selector-modal.ts` (NEW)

**Purpose**: Show when contract language ≠ user preferred language

**UI Design**:
```
┌────────────────────────────────────────────────┐
│  📄 Contract Language Detected                 │
│                                                │
│  Your contract is in English 🇬🇧               │
│  Choose your preferred analysis language:      │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🇸🇦 Arabic (العربية)                     │ │
│  │ ✅ Recommended - Matches your app         │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🇬🇧 English (Original)                   │ │
│  │ 📝 Read analysis in contract's language  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  💡 Tip: Analyzing in original language       │
│  ensures legal accuracy, but results will be  │
│  translated to your chosen language.          │
└────────────────────────────────────────────────┘
```

**Component Logic**:
```typescript
@Component({
  selector: 'app-language-selector-modal',
  imports: [CommonModule, Button],
  templateUrl: './language-selector-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSelectorModal {
  onboardingStore = inject(OnboardingStore);
  languageStore = inject(LanguageStore);
  
  // Computed values
  detectedLanguage = this.onboardingStore.detectedLanguage;
  userPreferredLanguage = this.onboardingStore.userPreferredLanguage;
  availableLanguages = this.languageStore.availableLanguages;
  
  /**
   * User selects to analyze in their preferred language (with translation)
   */
  selectPreferredLanguage(): void {
    const preferred = this.userPreferredLanguage();
    this.onboardingStore.setSelectedLanguage(preferred);
    console.log(`🌍 User chose: Analyze in ${preferred} (will translate from ${this.detectedLanguage()})`);
  }
  
  /**
   * User selects to keep original language (no translation)
   */
  selectOriginalLanguage(): void {
    const detected = this.detectedLanguage();
    this.onboardingStore.setSelectedLanguage(detected);
    console.log(`🌍 User chose: Keep original ${detected} (no translation)`);
  }
}
```

---

## 📦 Phase 4: Update Contract Analysis Service (Day 4)

### **4.1 Integrate Translation into Analysis Flow**

**File**: `src/app/core/services/contract-analysis.service.ts`

**Changes**:
```typescript
@Injectable({
  providedIn: 'root',
})
export class ContractAnalysisService {
  private aiOrchestrator = inject(AiOrchestratorService);
  private parser = inject(ContractParserService);
  private translationOrchestrator = inject(TranslationOrchestratorService);  // 👈 NEW
  
  /**
   * Analyze a contract from parsed input with optional context
   */
  async analyzeContract(
    parsedContract: ParsedContract,
    context?: AnalysisContext
  ): Promise<{
    contract: Contract;
    analysis: ContractAnalysis;
  }> {
    // ... existing analysis logic ...
    
    // After getting AI analysis (in original language)
    let structuredAnalysis: AIAnalysisResponse = JSON.parse(aiAnalysis.clauses);
    
    // Store original (untranslated) version
    const originalAnalysis = structuredAnalysis;
    
    // 🌍 TRANSLATION LOGIC
    const needsTranslation = this.translationOrchestrator.needsTranslation(
      context.contractLanguage,
      context.analyzedInLanguage
    );
    
    if (needsTranslation) {
      console.log(`🌍 [Analysis] Translation needed: ${context.contractLanguage} → ${context.analyzedInLanguage}`);
      
      // Translate the analysis output
      structuredAnalysis = await this.translationOrchestrator.translateAnalysis(
        structuredAnalysis,
        context.contractLanguage,
        context.analyzedInLanguage
      );
      
      console.log(`✅ [Analysis] Translation completed`);
    }
    
    // Build final analysis object
    const analysis: ContractAnalysis = {
      id: contract.id,
      summary: JSON.stringify(structuredAnalysis, null, 2),
      originalSummary: needsTranslation ? JSON.stringify(originalAnalysis, null, 2) : undefined,  // 👈 NEW
      clauses: this.parseClausesFromJSON(structuredAnalysis),
      riskScore: this.calculateRiskScore(clauses),
      obligations: this.parseObligationsFromJSON(structuredAnalysis),
      omissions: structuredAnalysis.omissions,
      questions: structuredAnalysis.questions,
      metadata: structuredAnalysis.metadata,
      contextWarnings: structuredAnalysis.contextWarnings,
      disclaimer: structuredAnalysis.disclaimer,
      analyzedAt: new Date(),
      
      // 👇 NEW: Translation metadata
      translationInfo: needsTranslation ? {
        wasTranslated: true,
        sourceLanguage: context.contractLanguage,
        targetLanguage: context.analyzedInLanguage,
        translatedAt: new Date(),
      } : undefined,
    };
    
    return { contract, analysis };
  }
}
```

---

## 📦 Phase 5: Update Contract Store (Day 5)

### **5.1 Pass Translation Context to Analysis**

**File**: `src/app/core/stores/contract.store.ts`

**Changes**:
```typescript
/**
 * Analyze a contract (main orchestration method)
 */
async analyzeContract(parsedContract: ParsedContract): Promise<void> {
  patchState(store, { isUploading: true, uploadError: null });

  try {
    patchState(store, { isAnalyzing: true, analysisError: null });
    
    // Step 1: Detect contract language
    console.log('🌍 [Analysis] Detecting contract language...');
    languageStore.detectContractLanguage(parsedContract.text);
    
    // Step 2: Build analysis context with translation info
    const detectedParties = onboardingStore.detectedParties();
    const analysisContext = {
      contractLanguage: languageStore.detectedContractLanguage() || 'en',
      userPreferredLanguage: languageStore.preferredLanguage(),
      analyzedInLanguage: onboardingStore.selectedLanguage() || languageStore.preferredLanguage(),  // 👈 NEW
      userRole: onboardingStore.selectedRole(),
      detectedParties: detectedParties?.parties && detectedParties.parties.party1 && detectedParties.parties.party2
        ? { 
            party1: detectedParties.parties.party1,
            party2: detectedParties.parties.party2
          }
        : undefined,
    };
    
    console.log('📊 [Analysis] Context:', analysisContext);
    
    // Step 3: Call the analysis service with translation context
    const { contract, analysis } = await analysisService.analyzeContract(
      parsedContract,
      analysisContext  // 👈 Includes analyzedInLanguage
    );
    
    // Update store with results
    patchState(store, { 
      contract, 
      analysis,
      isUploading: false,
      isAnalyzing: false,
      uploadError: null,
      analysisError: null,
    });
    
    console.log('✅ [Analysis] Contract analysis completed with translation');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
    patchState(store, { 
      analysisError: errorMessage,
      isUploading: false,
      isAnalyzing: false,
    });
    throw error;
  }
},
```

---

## 📦 Phase 6: Update Analysis Dashboard UI (Day 6)

### **6.1 Add Translation Badge**

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.html`

**Add to header**:
```html
<!-- Header with contract info -->
<div class="mb-8">
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
    <div class="flex-1">
      <div class="flex items-center gap-3 flex-wrap">
        <h1 class="text-3xl font-bold text-gray-900">Contract Analysis</h1>
        
        <!-- 👇 NEW: Translation Badge -->
        @if (wasTranslated()) {
          <span class="inline-flex items-center px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200">
            🌍 Translated from {{ getSourceLanguageName() }}
          </span>
        }
      </div>
      <p class="text-gray-600 mt-2">Analyzed on {{ formatDate(contractStore.analysis()?.analyzedAt) }}</p>
    </div>
    
    <!-- 👇 NEW: Show Original Button -->
    @if (wasTranslated()) {
      <button
        (click)="toggleOriginal()"
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors">
        @if (showingOriginal()) {
          🔍 Show Translated
        } @else {
          📝 Show Original {{ getSourceLanguageName() }}
        }
      </button>
    }
  </div>
</div>
```

### **6.2 Add Toggle Logic**

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.ts`

```typescript
export class AnalysisDashboard implements OnInit {
  contractStore = inject(ContractStore);
  
  // 👇 NEW: Translation state
  showingOriginal = signal(false);
  
  /**
   * Check if analysis was translated
   */
  wasTranslated = computed(() => {
    return this.contractStore.analysis()?.translationInfo?.wasTranslated ?? false;
  });
  
  /**
   * Get source language name
   */
  getSourceLanguageName(): string {
    const code = this.contractStore.analysis()?.translationInfo?.sourceLanguage;
    const languages: Record<string, string> = {
      'en': 'English',
      'fr': 'French',
      'ar': 'Arabic',
      'es': 'Spanish',
      'de': 'German',
    };
    return languages[code || 'en'] || code;
  }
  
  /**
   * Toggle between translated and original
   */
  toggleOriginal(): void {
    this.showingOriginal.update(v => !v);
    
    // Re-parse AI response to show original or translated
    if (this.showingOriginal()) {
      this.parseAIResponse(true);  // Parse original
    } else {
      this.parseAIResponse(false);  // Parse translated
    }
  }
  
  /**
   * Parse AI response (updated to support original toggle)
   */
  private parseAIResponse(useOriginal = false): void {
    const analysis = this.contractStore.analysis();
    if (!analysis) return;
    
    // Use original or translated summary
    const summaryText = useOriginal && analysis.originalSummary
      ? analysis.originalSummary
      : analysis.summary;
    
    // ... rest of parsing logic ...
  }
}
```

---

## 📦 Phase 7: Update Language Store (Day 7)

### **7.1 Add Translation Cache**

**File**: `src/app/core/stores/language.store.ts`

**Already implemented** ✅ - Just verify:
```typescript
interface LanguageState {
  // ... existing fields ...
  translationCache: Record<string, string>;  // ✅ Already exists
}

withMethods((store, translatorService = inject(TranslatorService)) => ({
  /**
   * Translate text with caching
   */
  translateText: async (text: string, sourceLanguage: string, targetLanguage: string): Promise<string> => {
    // Check cache first
    const cacheKey = `${text.substring(0, 100)}-${sourceLanguage}-${targetLanguage}`;
    const cached = store.translationCache()[cacheKey];
    if (cached) {
      console.log('📦 Using cached translation');
      return cached;
    }
    
    // Translate and cache
    const translated = await translatorService.translate(text, sourceLanguage, targetLanguage);
    
    patchState(store, { 
      translationCache: {
        ...store.translationCache(),
        [cacheKey]: translated,
      },
    });
    
    return translated;
  },
}))
```

---

## 🧪 Testing Strategy (Day 8-9)

### **Test Cases**

#### **1. Language Match (No Translation)**
```
Given: User uploads English contract
And: User's app language is English
Then: No language modal shown
And: Analysis in English (no translation)
And: No translation badge shown
```

#### **2. Language Mismatch - User Chooses Translation**
```
Given: User uploads English contract
And: User's app language is Arabic
When: Language modal appears
And: User selects "Arabic"
Then: AI analyzes in English
And: Results translated to Arabic
And: Translation badge shown
And: "Show Original English" button visible
```

#### **3. Language Mismatch - User Keeps Original**
```
Given: User uploads French contract
And: User's app language is English
When: Language modal appears
And: User selects "French (Original)"
Then: AI analyzes in French
And: Results shown in French (no translation)
And: No translation badge shown
```

#### **4. Toggle Original/Translated**
```
Given: Analysis was translated (English → Arabic)
When: User clicks "Show Original English"
Then: UI shows original English analysis
And: Button changes to "Show Translated"
When: User clicks "Show Translated"
Then: UI shows Arabic analysis again
```

---

## 📊 Success Metrics

### **Performance**
- ✅ Translation completes in < 2 seconds
- ✅ Cached translations load instantly
- ✅ Parallel translation of sections (not sequential)

### **User Experience**
- ✅ Language modal only shows when needed
- ✅ Clear indication of translation
- ✅ Easy toggle between original and translated
- ✅ Transparent about translation process

### **Accuracy**
- ✅ Legal terms preserved (not translated)
- ✅ Party names unchanged
- ✅ Dates and numbers formatted correctly
- ✅ Original always available for reference

---

## 🚀 Deployment Checklist

### **Before Deploying**
- [ ] Test all language pairs (en→ar, fr→en, etc.)
- [ ] Verify translation cache working
- [ ] Test toggle original/translated
- [ ] Test language modal appearance conditions
- [ ] Verify RTL layout for Arabic
- [ ] Test with long contracts (performance)
- [ ] Test with no internet (graceful degradation)

### **Post-Deployment Monitoring**
- [ ] Monitor translation API usage
- [ ] Track user language preferences
- [ ] Monitor translation errors
- [ ] Collect feedback on translation quality

---

## 📝 Summary

### **What We're Building**

1. **Smart Language Detection** - Auto-detect contract language
2. **User Choice** - Let user choose analysis output language
3. **Intelligent Translation** - Translate AI output, not contract
4. **Transparent UX** - Show translation badge and toggle
5. **Performance** - Cache translations, parallel processing
6. **Accuracy** - Preserve legal terms, names, numbers

### **Timeline**: 9 Days

- Days 1-2: Data models & Translation Orchestrator
- Day 3: Language Selection Modal
- Days 4-5: Integration into analysis flow
- Days 6-7: Dashboard UI & Language Store updates
- Days 8-9: Testing & bug fixes

### **Result**

Users can analyze contracts in any language and view results in their preferred language, with full transparency and the ability to see the original. Legal accuracy is preserved by analyzing in the contract's original language. 🌍✨

---

**Next Steps**: Review this plan, get approval, then start Day 1 implementation! 🚀

