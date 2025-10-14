# 🎯 Pragmatic Implementation Roadmap

**Philosophy**: Baby steps, test each change, don't break existing functionality
**Timeline**: 2-3 weeks, split into small PRs
**Date**: October 14, 2025

---

## 🚦 Priority Levels

**P0 (Critical)**: Blocks production, affects core functionality
**P1 (High)**: Major improvements, user-facing
**P2 (Medium)**: Nice to have, enhances UX
**P3 (Low)**: Future improvements

---

## 📦 PHASE 1: JSON Schema Foundation (P0 - Week 1)

**Goal**: Eliminate JSON parsing errors with `responseConstraint`
**Why First**: Most critical reliability issue
**Time**: 3-4 days

### **Step 1.1: Create Basic Schema (Day 1)**

**File**: `src/app/core/schemas/analysis-schemas.ts`

Start with **ONE schema** - the most problematic one:

```typescript
/**
 * Schema for risk analysis
 * Using Lucide icon names instead of emojis
 */
export const RISKS_SCHEMA = {
  type: "object",
  description: "Extract and analyze contract risks",
  properties: {
    risks: {
      type: "array",
      description: "List of identified risks in the contract",
      items: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Short risk title (e.g., 'At-Will Employment')"
          },
          severity: {
            type: "string",
            enum: ["high", "medium", "low"],  // lowercase, no emojis
            description: "Risk severity level"
          },
          icon: {
            type: "string",
            enum: ["alert-triangle", "alert-circle", "info"],  // Lucide icons
            description: "Icon name: alert-triangle (high), alert-circle (medium), info (low)"
          },
          description: {
            type: "string",
            description: "Clear explanation of the risk in plain language"
          },
          impact: {
            type: "string",
            description: "Concrete impact this risk could have"
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

export type RisksAnalysis = {
  risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    icon: 'alert-triangle' | 'alert-circle' | 'info';
    description: string;
    impact: string;
  }>;
};
```

**Test**: Create simple test contract, verify schema validation

**Deliverable**: One working schema with types

---

### **Step 1.2: Update Prompt Service (Day 2)**

**File**: `src/app/core/services/ai/prompt.service.ts`

Add **minimal** method to use schema:

```typescript
/**
 * Extract risks with schema constraint
 */
async extractRisksWithSchema(contractText: string): Promise<RisksAnalysis> {
  if (!this.session) {
    await this.createSession();
  }

  const prompt = `Analyze risks in this contract:

${contractText}

Identify all potential risks and classify by severity (high, medium, low).`;

  console.log('📤 [AI] Extracting risks with schema...');

  const resultString = await this.session!.prompt(prompt, {
    responseConstraint: RISKS_SCHEMA,
  });

  console.log('📥 [AI] Received structured response');

  const parsed = JSON.parse(resultString);
  return parsed as RisksAnalysis;
}
```

**Test**: Call method with test contract, verify JSON is valid

**Deliverable**: One working schema-based extraction method

---

### **Step 1.3: Update Contract Analysis Service (Day 3)**

**File**: `src/app/core/services/contract-analysis.service.ts`

Replace **one section** with schema-based extraction:

```typescript
// OLD: Manual parsing
const clauses = structuredAnalysis
  ? this.parseClausesFromJSON(structuredAnalysis)
  : await this.parseClausesFromAI(aiAnalysis.clauses, parsedContract.text);

// NEW: Use schema
let risks: RisksAnalysis;
try {
  risks = await this.promptService.extractRisksWithSchema(parsedContract.text);
  console.log('✅ [Analysis] Risks extracted with schema');
} catch (error) {
  console.error('❌ [Analysis] Schema extraction failed, using fallback');
  // Fallback to old method
  risks = this.parseRisksFromText(parsedContract.text);
}
```

**Test**: Full contract upload flow, verify risks display correctly

**Deliverable**: Schema-based extraction working in production flow

---

### **Step 1.4: Add Remaining Schemas (Day 4)**

Only **after** first schema works, add others:
- `METADATA_SCHEMA`
- `OBLIGATIONS_SCHEMA`
- `OMISSIONS_SCHEMA`

**Test**: Each schema independently

**Deliverable**: All schemas working, JSON parsing 100% reliable

**✅ Checkpoint**: JSON parsing is now bulletproof. Ship this!

---

## 📦 PHASE 2: Language Configuration (P0 - Week 1)

**Goal**: Fix language configuration to match official API
**Why Second**: Critical for multi-language support
**Time**: 2 days

### **Step 2.1: Update Language Config (Day 5)**

**File**: `src/app/core/services/ai/prompt.service.ts`

Fix `createSession()` method:

```typescript
async createSession(options?: {
  userRole?: string;
  contractLanguage?: string;
  outputLanguage?: string;
}): Promise<AILanguageModel> {
  const contractLang = options?.contractLanguage || 'en';
  const outputLang = options?.outputLanguage || 'en';

  const createOptions: AILanguageModelCreateOptions = {
    initialPrompts: [{
      role: 'system',
      content: this.buildSystemPrompt(contractLang, outputLang, options?.userRole)
    }],
    // ✅ CORRECT configuration (from official docs)
    expectedInputs: [{
      type: "text",
      languages: ["en", contractLang]  // System prompt (en), User prompt (contract lang)
    }],
    expectedOutputs: [{
      type: "text",
      languages: [outputLang]  // Expected output language
    }],
    monitor: (m) => { /* ... */ }
  };

  this.session = await window.LanguageModel.create(createOptions);
  return this.session;
}
```

**Test**: Create session with different languages (en, es, ja)

**Deliverable**: Language configuration correct

---

### **Step 2.2: Add Language Instructions to Prompt (Day 6)**

**File**: `src/app/core/services/ai/prompt.service.ts`

Add language context to system prompt:

```typescript
private buildSystemPrompt(
  contractLang: string,
  outputLang: string,
  userRole?: string
): string {
  const perspectivePrompt = userRole ? this.buildPerspectivePrompt(userRole) : '';

  const languageInstructions = `**LANGUAGE CONTEXT:**
- Contract language: ${this.getLanguageName(contractLang)}
- You MUST respond in: ${this.getLanguageName(outputLang)}
- Preserve party names, dates, amounts exactly as they appear in the contract
- For legal terms that don't translate well: keep original with brief explanation`;

  return `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt}

${languageInstructions}

**OUTPUT FORMAT:**
You MUST respond with valid JSON conforming to the provided schema.
All text content must be in ${this.getLanguageName(outputLang)}.`;
}
```

**Test**: Analyze Spanish contract, verify output in Spanish

**Deliverable**: Language instructions working

**✅ Checkpoint**: Language configuration correct. Ship this!

---

## 📦 PHASE 3: Caching & Dynamic Language Switching (P1 - Week 2)

**Goal**: Support dynamic language switching without re-analysis
**Why Third**: Major UX improvement, complex but contained
**Time**: 3-4 days

### **Step 3.1: Create Cache Service (Day 7)**

**New File**: `src/app/core/services/analysis-cache.service.ts`

```typescript
import { Injectable } from '@angular/core';

interface CachedAnalysis {
  contractHash: string;  // Hash of contract text
  originalLanguage: string;  // Language analysis was done in
  originalAnalysis: any;  // Original analysis (untranslated)
  translations: Record<string, any>;  // Cache per language
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnalysisCacheService {
  private readonly CACHE_KEY = 'contract_analysis_cache';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save analysis to cache
   */
  saveAnalysis(
    contractHash: string,
    originalLanguage: string,
    analysis: any
  ): void {
    const cached: CachedAnalysis = {
      contractHash,
      originalLanguage,
      originalAnalysis: analysis,
      translations: {},
      timestamp: Date.now(),
    };

    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cached));
    console.log('💾 [Cache] Analysis saved');
  }

  /**
   * Get cached analysis
   */
  getCachedAnalysis(contractHash: string): CachedAnalysis | null {
    const cached = localStorage.getItem(this.CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedAnalysis = JSON.parse(cached);

    // Check if cache is for same contract
    if (parsed.contractHash !== contractHash) {
      console.log('❌ [Cache] Different contract, clearing cache');
      this.clearCache();
      return null;
    }

    // Check if cache is expired
    if (Date.now() - parsed.timestamp > this.MAX_CACHE_AGE) {
      console.log('⏰ [Cache] Expired, clearing cache');
      this.clearCache();
      return null;
    }

    console.log('✅ [Cache] Found valid cache');
    return parsed;
  }

  /**
   * Save translated version
   */
  saveTranslation(
    contractHash: string,
    language: string,
    translatedAnalysis: any
  ): void {
    const cached = this.getCachedAnalysis(contractHash);
    if (!cached) return;

    cached.translations[language] = translatedAnalysis;
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(cached));
    console.log(`💾 [Cache] Translation saved (${language})`);
  }

  /**
   * Get translation from cache
   */
  getCachedTranslation(contractHash: string, language: string): any | null {
    const cached = this.getCachedAnalysis(contractHash);
    if (!cached) return null;

    const translation = cached.translations[language];
    if (translation) {
      console.log(`✅ [Cache] Found cached translation (${language})`);
      return translation;
    }

    console.log(`❌ [Cache] No translation found (${language})`);
    return null;
  }

  /**
   * Clear cache (call on new contract upload)
   */
  clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ [Cache] Cleared');
  }

  /**
   * Generate hash for contract text
   */
  hashContract(text: string): string {
    // Simple hash function (use crypto for production)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
```

**Test**: Save/retrieve analysis, clear cache

**Deliverable**: Working cache service

---

### **Step 3.2: Add Language Switch Handler (Day 8)**

**File**: `src/app/core/stores/contract.store.ts`

Add method to handle language switch:

```typescript
withMethods((
  store,
  cacheService = inject(AnalysisCacheService),
  translationOrchestrator = inject(TranslationOrchestratorService),
  // ... other services
) => ({
  /**
   * Handle language switch (user changes app language while viewing analysis)
   */
  async switchAnalysisLanguage(newLanguage: string): Promise<void> {
    const currentAnalysis = store.analysis();
    const contract = store.contract();

    if (!currentAnalysis || !contract) return;

    // Check if we already have this language
    const currentLang = currentAnalysis.metadata?.analyzedInLanguage || 'en';
    if (currentLang === newLanguage) {
      console.log('✅ [Store] Already in requested language');
      return;
    }

    console.log(`🌍 [Store] Switching language: ${currentLang} → ${newLanguage}`);

    // Show loading state
    patchState(store, {
      isTranslating: true,  // NEW flag
      translationProgress: 0
    });

    try {
      // Generate contract hash
      const contractHash = cacheService.hashContract(contract.text);

      // Check cache first
      const cachedTranslation = cacheService.getCachedTranslation(contractHash, newLanguage);

      if (cachedTranslation) {
        console.log('✅ [Store] Using cached translation');
        patchState(store, {
          analysis: cachedTranslation,
          isTranslating: false,
          translationProgress: 100,
        });
        return;
      }

      // Need to translate
      console.log('🔄 [Store] Translating analysis...');
      patchState(store, { translationProgress: 20 });

      // Get original analysis (in contract language)
      const originalAnalysis = currentAnalysis.originalSummary
        ? JSON.parse(currentAnalysis.originalSummary)
        : JSON.parse(currentAnalysis.summary);

      const originalLanguage = currentAnalysis.translationInfo?.sourceLanguage || 'en';

      patchState(store, { translationProgress: 40 });

      // Translate to new language
      const translatedAnalysis = await translationOrchestrator.translateAnalysis(
        originalAnalysis,
        originalLanguage,
        newLanguage
      );

      patchState(store, { translationProgress: 80 });

      // Build updated analysis object
      const updatedAnalysis: ContractAnalysis = {
        ...currentAnalysis,
        summary: JSON.stringify(translatedAnalysis, null, 2),
        metadata: {
          ...currentAnalysis.metadata,
          analyzedInLanguage: newLanguage,
        },
        translationInfo: {
          wasTranslated: true,
          sourceLanguage: originalLanguage,
          targetLanguage: newLanguage,
          translatedAt: new Date(),
        },
      };

      // Save to cache
      cacheService.saveTranslation(contractHash, newLanguage, updatedAnalysis);

      // Update store
      patchState(store, {
        analysis: updatedAnalysis,
        isTranslating: false,
        translationProgress: 100,
      });

      console.log('✅ [Store] Language switch complete');

    } catch (error) {
      console.error('❌ [Store] Language switch failed:', error);
      patchState(store, {
        isTranslating: false,
        translationProgress: 0,
      });
      // Keep current language on error
    }
  },

  /**
   * Clear cache on new contract upload
   */
  clearAnalysisCache(): void {
    cacheService.clearCache();
  },
}))
```

**Test**: Upload contract, switch languages, verify cache works

**Deliverable**: Dynamic language switching works

---

### **Step 3.3: Update Language Store (Day 9)**

**File**: `src/app/core/stores/language.store.ts`

Listen for language changes and trigger analysis translation:

```typescript
withMethods((store, contractStore = inject(ContractStore)) => ({
  /**
   * Set preferred language (updated to trigger analysis translation)
   */
  async setPreferredLanguage(language: SupportedLanguage): Promise<void> {
    const oldLanguage = store.preferredLanguage();

    patchState(store, { preferredLanguage: language });
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    this.translate.use(language);

    console.log(`🌍 [Language] Changed from ${oldLanguage} to ${language}`);

    // If user is viewing analysis, translate it to new language
    if (contractStore.analysis()) {
      console.log('🔄 [Language] Triggering analysis translation...');
      await contractStore.switchAnalysisLanguage(language);
    }
  },
}))
```

**Test**: View analysis, change app language, see loader + translation

**Deliverable**: Language switching integrated with UI

**✅ Checkpoint**: Dynamic language switching works! Ship this!

---

## 📦 PHASE 4: Pre-Translation for Unsupported Languages (P1 - Week 2)

**Goal**: Support Arabic/Chinese contracts via translation
**Why Fourth**: Expands language support, well-isolated change
**Time**: 2-3 days

### **Step 4.1: Add Language Support Check (Day 10)**

**File**: `src/app/core/services/contract-analysis.service.ts`

```typescript
private async checkLanguageSupport(contractLang: string): Promise<{
  canAnalyze: boolean;
  needsPreTranslation: boolean;
  error?: string;
}> {
  const supportedDirectly = ['en', 'es', 'ja'];

  if (supportedDirectly.includes(contractLang)) {
    return { canAnalyze: true, needsPreTranslation: false };
  }

  // Check if Translator API is available
  const translatorAvailable = await this.translatorService.isAvailable();

  if (!translatorAvailable) {
    return {
      canAnalyze: false,
      needsPreTranslation: true,
      error: `Contract language "${this.getLanguageName(contractLang)}" is not yet supported by Chrome's AI.\n\n` +
             `Translation API is also unavailable.\n\n` +
             `Please upload a contract in English, Spanish, or Japanese.\n\n` +
             `ℹ️ The Chrome team is actively working on supporting more languages in the future.`
    };
  }

  // Check if we can translate this language
  const canTranslate = await this.translatorService.canTranslate(contractLang, 'en');

  if (canTranslate.available === 'no') {
    return {
      canAnalyze: false,
      needsPreTranslation: true,
      error: `Contract language "${this.getLanguageName(contractLang)}" is not yet supported.\n\n` +
             `Supported languages:\n` +
             `✓ English\n` +
             `✓ Spanish\n` +
             `✓ Japanese\n\n` +
             `ℹ️ The Chrome team is working on expanding language support.`
    };
  }

  // Can translate!
  return { canAnalyze: true, needsPreTranslation: true };
}
```

**Test**: Check support for en, es, ja, ar, zh

**Deliverable**: Language support detection works

---

### **Step 4.2: Add Pre-Translation (Day 11)**

**File**: `src/app/core/services/contract-analysis.service.ts`

Add pre-translation step **before** analysis:

```typescript
async analyzeContract(
  parsedContract: ParsedContract,
  context?: AnalysisContext
): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
  // ... existing setup ...

  // Check language support
  const langSupport = await this.checkLanguageSupport(context.contractLanguage);

  if (!langSupport.canAnalyze) {
    throw new Error(langSupport.error);
  }

  let textForAnalysis = parsedContract.text;
  let analysisLanguage = context.contractLanguage;
  let wasPreTranslated = false;

  // Pre-translate if needed
  if (langSupport.needsPreTranslation) {
    console.log(`⚠️ [Analysis] Pre-translating ${context.contractLanguage} → en`);

    textForAnalysis = await this.translatorService.translate(
      parsedContract.text,
      context.contractLanguage,
      'en'
    );

    analysisLanguage = 'en';
    wasPreTranslated = true;

    console.log(`✅ [Analysis] Pre-translation complete (${textForAnalysis.length} chars)`);
  }

  // Continue with analysis using translated text...
  const aiAnalysis = await this.aiOrchestrator.analyzeContract(
    textForAnalysis,  // Use translated text if needed
    context.userRole
  );

  // ... rest of analysis flow ...

  // Add pre-translation info to metadata
  if (wasPreTranslated) {
    analysis.translationInfo = {
      ...analysis.translationInfo,
      wasPreTranslated: true,
      preTranslationWarning:
        `⚠️ Original contract was in ${this.getLanguageName(context.contractLanguage)}, ` +
        `which is not yet supported by Chrome's AI. ` +
        `The contract was translated to English for analysis. ` +
        `Some legal nuances may be lost in translation.`,
    };
  }
}
```

**Test**: Upload Arabic contract, verify pre-translation

**Deliverable**: Pre-translation works

---

### **Step 4.3: Update Language Modal with Warning (Day 12)**

**File**: `src/app/shared/components/language-mismatch-modal/language-mismatch-modal.ts`

Add warning badge when pre-translation needed:

```typescript
export interface LanguageMismatchData {
  // ... existing fields
  needsPreTranslation: boolean;  // NEW
  preTranslationWarning?: string;  // NEW
}
```

**Template**: `language-mismatch-modal.html`

```html
<!-- Warning for unsupported contract languages -->
@if (data.needsPreTranslation) {
  <div class="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg mb-4 rtl:border-r-4 rtl:border-l-0">
    <div class="flex items-start gap-3 rtl:flex-row-reverse">
      <lucide-icon [img]="AlertTriangleIcon" class="w-5 h-5 text-amber-600 flex-shrink-0"></lucide-icon>
      <div class="flex-1 rtl:text-right">
        <p class="text-sm font-medium text-amber-900 mb-2">
          {{ 'language.contractLanguageNotSupported' | translate }}
        </p>
        <p class="text-xs text-amber-700 mb-2">
          {{ 'language.willTranslateToEnglish' | translate: { language: getLanguageName(data.detectedLanguage) } }}
        </p>
        <p class="text-xs text-amber-600">
          ℹ️ {{ 'language.chromeTeamWorkingOnSupport' | translate }}
        </p>
        <p class="text-xs text-amber-600 mt-1">
          ⚠️ {{ 'language.translationMayLoseNuances' | translate }}
        </p>
      </div>
    </div>
  </div>
}
```

**i18n keys** (`public/i18n/en.json`):

```json
{
  "language": {
    "contractLanguageNotSupported": "Contract Language Not Yet Supported",
    "willTranslateToEnglish": "Your {{language}} contract will be translated to English for analysis",
    "chromeTeamWorkingOnSupport": "Chrome team is actively working on supporting more languages",
    "translationMayLoseNuances": "Note: Some legal nuances may be lost in translation"
  }
}
```

**Test**: Upload Arabic contract, see warning modal

**Deliverable**: User sees transparency about pre-translation

**✅ Checkpoint**: Pre-translation works with clear warnings! Ship this!

---

## 📦 PHASE 5: Progressive Loading (P2 - Week 3)

**Goal**: Load tabs progressively for better UX
**Why Fifth**: Major UX improvement but complex
**Time**: 3-4 days

**Note**: This is lower priority - only implement after P0/P1 work is solid.

### **Step 5.1-5.4**: See IMPLEMENTATION_PLAN_V2.md Phase 2

(We'll tackle this after core functionality is bulletproof)

---

## 🎯 Priority Summary

### **Week 1 (P0 - Critical)**
✅ **Days 1-4**: JSON Schema foundation
✅ **Days 5-6**: Language configuration

**Deliverable**: Reliable JSON parsing + correct language setup

### **Week 2 (P1 - High Priority)**
✅ **Days 7-9**: Caching + dynamic language switching
✅ **Days 10-12**: Pre-translation for unsupported languages

**Deliverable**: Full multi-language support with caching

### **Week 3 (P2 - Medium Priority)**
⏳ **Days 13-16**: Progressive loading (optional)

**Deliverable**: Better perceived performance

---

## 🧪 Testing Strategy

### **After Each Step**
1. ✅ Unit test the specific change
2. ✅ Test in isolation (don't break existing)
3. ✅ Test full flow (upload → analyze → view)
4. ✅ Test edge cases (no internet, API fails, etc.)

### **Test Contracts**
- English employment contract
- Spanish lease agreement
- Arabic NDA (for pre-translation)
- Invalid/corrupted file

### **Test Scenarios**
- Upload → Analyze → View (baseline)
- Upload → Analyze → Switch language → View
- Upload → Analyze → Close → Reopen (cache test)
- Upload new contract → Verify cache cleared

---

## 🚀 Deployment Strategy

### **After Week 1 (P0)**
✅ Ship to production
- JSON parsing is now 100% reliable
- Language configuration correct
- No breaking changes

### **After Week 2 (P1)**
✅ Ship to production
- Caching works
- Dynamic language switching works
- Pre-translation for unsupported languages

### **Week 3 (P2)**
⏳ Optional - ship if time permits

---

## 📋 Immediate Next Steps (Today/Tomorrow)

### **Step 1: Create First Schema**
1. Create `src/app/core/schemas/analysis-schemas.ts`
2. Add `RISKS_SCHEMA` only
3. Add TypeScript type
4. Test schema validation

### **Step 2: Add Schema Method**
1. Update `prompt.service.ts`
2. Add `extractRisksWithSchema()` method
3. Test with sample contract

### **Step 3: Integrate with Analysis**
1. Update `contract-analysis.service.ts`
2. Replace one section with schema-based extraction
3. Test full flow

**Goal**: Get ONE schema working end-to-end today/tomorrow

---

## ❓ Questions Before Starting

1. **Time Available**: Can you dedicate 2-3 weeks for this?
2. **Testing**: Do you have test contracts in multiple languages?
3. **API Limits**: Any restrictions on Translator API usage?
4. **Browser**: Will you test on Chrome Canary with flags enabled?

---

**Ready to start with Step 1?** We can create the first schema together and test it end-to-end. Baby steps! 🚀
