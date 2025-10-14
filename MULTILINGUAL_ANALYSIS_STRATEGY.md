# 🌍 Multilingual Contract Analysis: Strategy & Recommendations

**Date**: October 13, 2025
**Author**: Claude Code Analysis
**Purpose**: Comprehensive strategy for handling non-English contract analysis with Chrome Built-in AI

---

## 📊 Current System Analysis

### **How It Works Now**

1. **Language Detection**: Uses `LanguageDetectorService` to detect contract language
2. **User Language Selection**: User chooses between contract language or their preferred language
3. **Analysis Flow**:
   ```
   Contract (Any Language)
   → Prompt API analyzes in contract language
   → JSON response in contract language
   → Translation Orchestrator translates OUTPUT to user's preferred language
   → User sees results in their chosen language
   ```

4. **Translation Strategy**: "Translate OUTPUT, not contract"
   - AI analyzes contract in **original language** (preserves legal nuance)
   - Results are **translated after analysis** using Translator API
   - Original analysis is **stored for reference**

### **Current Prompts**

#### System Prompt (prompt.service.ts:74-187)
```typescript
systemPrompt: `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt}  // Role-based perspective (employer, employee, etc.)

**CRITICAL INSTRUCTIONS:**
1. You must respond ONLY with valid JSON
2. NO markdown code blocks (no \`\`\`json)
3. NO extra text or explanations
...
`
```

**Key Issues with Current Prompt:**
- ❌ No mention of language handling
- ❌ Assumes English-only input/output
- ❌ No instruction about maintaining original language
- ❌ No guidance on legal terminology preservation

---

## 🔍 Chrome Prompt API Language Capabilities

### **Official Support** (From Chrome Documentation)

According to official Chrome docs (as of Chrome 140+):

> **Gemini Nano Language Support:**
> - **Supported Input Languages**: English (en), Spanish (es), Japanese (ja)
> - **Supported Output Languages**: English (en), Spanish (es), Japanese (ja)
> - **Best Performance**: English
> - **Limited Support**: Other languages may work but with reduced accuracy

### **What This Means:**

✅ **Supported Languages** (High Quality):
- English (en) - Primary language
- Spanish (es) - Official support
- Japanese (ja) - Official support

⚠️ **Partially Supported** (May Work):
- French (fr)
- German (de)
- Other European languages

❌ **Not Well Supported**:
- Arabic (ar) - RTL language, limited model training
- Chinese (zh) - Different character set
- Korean (ko) - Different character set

### **Setting Language in Prompt API**

```typescript
const session = await window.LanguageModel.create({
  expectedInputs: {
    modality: 'text',
    language: 'en'  // Input language
  },
  expectedOutputs: {
    modality: 'text',
    language: 'en'  // Output language
  },
  systemPrompt: "..."
});
```

**Important**: The `language` parameter is a **hint**, not a guarantee. The model may still respond in a different language depending on the input.

---

## 🎯 Critical Questions & Answers

### **Q1: Can Gemini Nano respond in the contract's language?**

**Answer**: **Partial - Only for English, Spanish, and Japanese**

- ✅ English contract → English response: YES (100% reliable)
- ✅ Spanish contract → Spanish response: YES (official support)
- ✅ Japanese contract → Japanese response: YES (official support)
- ⚠️ French contract → French response: MAYBE (limited support)
- ⚠️ German contract → German response: MAYBE (limited support)
- ❌ Arabic contract → Arabic response: NO (not supported)
- ❌ Chinese contract → Chinese response: NO (not supported)

### **Q2: Should we update prompts for non-English contracts?**

**Answer**: **YES - Add explicit language instructions**

**Recommended Prompt Enhancement**:

```typescript
systemPrompt: `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt}

**LANGUAGE INSTRUCTIONS:**
- The contract is written in: ${contractLanguage}
- You must analyze and respond in: ${outputLanguage}
- Preserve legal terms in their original language when translation would lose meaning
- For party names, dates, amounts: keep original format
- For Arabic/RTL contracts: respond in English if Arabic output is not possible

**CRITICAL INSTRUCTIONS:**
1. You must respond ONLY with valid JSON
2. NO markdown code blocks
...
`
```

### **Q3: How to handle unsupported languages (Arabic, Chinese, etc.)?**

**Answer**: **Hybrid Approach - Analyze in English, Translate Output**

**Strategy for Unsupported Languages**:

1. **Input**: Arabic contract
2. **Pre-Translation**: Use Translator API to translate contract → English
3. **Analysis**: Prompt API analyzes English version
4. **Output Translation**: Translate results back to Arabic if user wants
5. **Preserve**: Store original contract language, show translation badge

**Pros**:
- ✅ Works for all languages
- ✅ Preserves original contract for reference
- ✅ User sees results in their preferred language

**Cons**:
- ⚠️ Translation adds latency (1-3 seconds)
- ⚠️ Potential loss of legal nuance in translation
- ⚠️ Requires Translator API availability

### **Q4: What if Translator API is unavailable?**

**Answer**: **Fallback to English-only analysis**

```typescript
// Check if translation is available for this language pair
const translationAvailable = await translatorService.canTranslate(
  contractLanguage,
  'en'
);

if (!translationAvailable.available) {
  // Show error: "This contract language is not supported"
  // Suggest: "Please upload an English version"
  return;
}
```

---

## 📋 Recommended Implementation Plan

### **Phase 1: Update Prompt Service (Priority: HIGH)**

**File**: `src/app/core/services/ai/prompt.service.ts`

#### **1.1 Add Language Parameters to Session Creation**

```typescript
async createSession(
  options?: AILanguageModelCreateOptions & {
    userRole?: UserRole;
    contractLanguage?: string;      // NEW
    outputLanguage?: string;        // NEW
  }
): Promise<AILanguageModel> {
  const perspectivePrompt = options?.userRole
    ? this.buildPerspectivePrompt(options.userRole)
    : '';

  const languageInstructions = this.buildLanguageInstructions(
    options?.contractLanguage || 'en',
    options?.outputLanguage || 'en'
  );

  const createOptions: AILanguageModelCreateOptions = {
    ...options,
    expectedInputs: {
      modality: 'text',
      language: options?.contractLanguage || 'en'
    },
    expectedOutputs: {
      modality: 'text',
      language: options?.outputLanguage || 'en'
    },
    initialPrompts: [
      {
        role: 'system',
        content: `You are an AI legal explainer that helps non-lawyers understand contracts clearly.

${perspectivePrompt}

${languageInstructions}

**CRITICAL INSTRUCTIONS:**
1. You must respond ONLY with valid JSON
2. NO markdown code blocks
...`
      }
    ],
    monitor: (m) => { /* ... */ }
  };

  this.session = await window.LanguageModel.create(createOptions);
  return this.session;
}
```

#### **1.2 Add Language Instructions Builder**

```typescript
/**
 * Build language-specific instructions for the AI
 */
private buildLanguageInstructions(
  contractLanguage: string,
  outputLanguage: string
): string {
  // Check if languages are the same
  if (contractLanguage === outputLanguage) {
    return `**LANGUAGE CONTEXT:**
- The contract is written in: ${this.getLanguageName(contractLanguage)}
- Analyze and respond in the same language: ${this.getLanguageName(outputLanguage)}
- Maintain all legal terminology exactly as written in the contract
`;
  }

  // Check if output language is supported by Gemini Nano
  const supportedLanguages = ['en', 'es', 'ja'];
  const outputSupported = supportedLanguages.includes(outputLanguage);

  if (outputSupported) {
    return `**LANGUAGE CONTEXT:**
- The contract is written in: ${this.getLanguageName(contractLanguage)}
- You MUST respond in: ${this.getLanguageName(outputLanguage)}
- Preserve legal terms that don't translate well in their original language
- For party names, amounts, dates: keep original formatting
- If you cannot respond in ${this.getLanguageName(outputLanguage)}, respond in English
`;
  }

  // Output language not supported - analyze in English, will be translated later
  return `**LANGUAGE CONTEXT:**
- The contract is written in: ${this.getLanguageName(contractLanguage)}
- Analyze the contract thoroughly in its original language
- Respond ONLY in English (analysis will be translated to ${this.getLanguageName(outputLanguage)} for the user)
- Preserve all party names, dates, amounts, and key legal terms in their original form
- Ensure your English response can be accurately translated
`;
}

/**
 * Get human-readable language name
 */
private getLanguageName(code: string): string {
  const names: Record<string, string> = {
    'en': 'English',
    'es': 'Spanish',
    'ja': 'Japanese',
    'fr': 'French',
    'de': 'German',
    'ar': 'Arabic',
    'zh': 'Chinese',
    'ko': 'Korean',
  };
  return names[code] || code.toUpperCase();
}
```

### **Phase 2: Handle Unsupported Input Languages (Priority: HIGH)**

**File**: `src/app/core/services/contract-analysis.service.ts`

#### **2.1 Add Pre-Translation for Unsupported Languages**

```typescript
async analyzeContract(
  parsedContract: ParsedContract,
  context?: AnalysisContext
): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
  // ... existing setup ...

  // Check if contract language is supported by Gemini Nano
  const contractLang = context.contractLanguage;
  const supportedInputLanguages = ['en', 'es', 'ja'];
  const needsPreTranslation = !supportedInputLanguages.includes(contractLang);

  let contractTextForAnalysis = parsedContract.text;
  let analysisSourceLanguage = contractLang;

  if (needsPreTranslation) {
    console.log(`⚠️ [Analysis] ${contractLang} not supported by Gemini Nano`);
    console.log(`🌍 [Analysis] Pre-translating contract to English...`);

    try {
      // Check if Translator API can handle this language
      const canTranslate = await this.translationOrchestrator.canTranslate(
        contractLang,
        'en'
      );

      if (!canTranslate) {
        throw new Error(
          `Translation from ${contractLang} to English is not available. ` +
          `Please upload an English, Spanish, or Japanese contract.`
        );
      }

      // Translate contract to English for analysis
      contractTextForAnalysis = await this.translator.translate(
        parsedContract.text,
        contractLang,
        'en'
      );

      analysisSourceLanguage = 'en';
      console.log(`✅ [Analysis] Contract translated to English (${contractTextForAnalysis.length} chars)`);
    } catch (error) {
      console.error(`❌ [Analysis] Pre-translation failed:`, error);
      throw new Error(
        `Cannot analyze ${this.getLanguageName(contractLang)} contracts. ` +
        `Supported languages: English, Spanish, Japanese. ` +
        `Please upload a contract in one of these languages.`
      );
    }
  }

  // Perform AI analysis with (possibly translated) contract
  const aiAnalysis = await this.aiOrchestrator.analyzeContract(
    contractTextForAnalysis,
    context.userRole,
    analysisSourceLanguage,  // NEW parameter
    context.analyzedInLanguage  // NEW parameter
  );

  // ... rest of analysis flow with post-translation if needed ...
}
```

#### **2.2 Add Translation Availability Check**

```typescript
/**
 * Check if we can analyze this contract language
 */
private async canAnalyzeLanguage(language: string): Promise<{
  canAnalyze: boolean;
  needsPreTranslation: boolean;
  error?: string;
}> {
  const supportedDirectly = ['en', 'es', 'ja'];

  if (supportedDirectly.includes(language)) {
    return { canAnalyze: true, needsPreTranslation: false };
  }

  // Check if we can translate to English first
  const translationAvailable = await this.translator.canTranslate(
    language,
    'en'
  );

  if (translationAvailable.available === 'no') {
    return {
      canAnalyze: false,
      needsPreTranslation: true,
      error: `Analysis of ${this.getLanguageName(language)} contracts requires translation, ` +
             `but the Translator API is not available for this language pair. ` +
             `Supported languages: English, Spanish, Japanese.`
    };
  }

  return { canAnalyze: true, needsPreTranslation: true };
}
```

### **Phase 3: Update Language Selection Modal (Priority: MEDIUM)**

**File**: `src/app/shared/components/language-mismatch-modal/language-mismatch-modal.ts`

#### **3.1 Add Language Support Warnings**

```typescript
export interface LanguageMismatchData {
  detectedLanguage: string;
  preferredLanguage: string;
  isContractLanguageSupported: boolean;  // Existing
  canAnalyzeDirectly: boolean;  // NEW: Can Gemini Nano analyze this language?
  needsPreTranslation: boolean;  // NEW: Needs translation before analysis?
  supportedAnalysisLanguages: string[];  // NEW: What languages can we analyze?
  onSelectContractLanguage: () => void;
  onSelectUserLanguage: () => void;
  getLanguageName: (code: string) => string;
  getLanguageFlag: (code: string) => string;
}
```

#### **3.2 Update Modal UI**

```html
<!-- Warning for unsupported contract languages -->
@if (data.needsPreTranslation) {
  <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
    <div class="flex items-start gap-3">
      <span class="text-2xl">⚠️</span>
      <div>
        <p class="text-sm font-medium text-amber-900 mb-1">
          {{ 'language.limitedSupport' | translate }}
        </p>
        <p class="text-xs text-amber-700">
          {{ 'language.willTranslateForAnalysis' | translate: { language: getLanguageName(data.detectedLanguage) } }}
        </p>
      </div>
    </div>
  </div>
}

<!-- Option 1: Analyze in contract language -->
<div class="p-4 bg-white border-2 rounded-xl hover:border-blue-500 cursor-pointer"
     (click)="data.onSelectContractLanguage()">
  <div class="flex items-center gap-3 mb-2">
    <span class="text-3xl">{{ getLanguageFlag(data.detectedLanguage) }}</span>
    <div>
      <h3 class="font-semibold text-gray-900">
        {{ getLanguageName(data.detectedLanguage) }}
      </h3>
      <p class="text-sm text-gray-600">
        {{ 'language.contractLanguage' | translate }}
      </p>
    </div>
  </div>

  <!-- Show translation warning if needed -->
  @if (data.needsPreTranslation) {
    <div class="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
      🌍 Contract will be translated to English for analysis, then results translated back
    </div>
  }

  <!-- Show UI language switch info -->
  @if (data.canAnalyzeDirectly && data.isContractLanguageSupported) {
    <div class="mt-2 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200">
      ✅ {{ 'language.appWillSwitch' | translate }}
    </div>
  } @else if (data.canAnalyzeDirectly && !data.isContractLanguageSupported) {
    <div class="mt-2 px-3 py-1.5 bg-gray-50 text-gray-700 text-xs rounded-lg border border-gray-200">
      ⚠️ {{ 'language.appWillStayInCurrent' | translate }}
    </div>
  }
</div>
```

### **Phase 4: Update Translation Flow (Priority: HIGH)**

**File**: `src/app/core/services/translation-orchestrator.service.ts`

#### **4.1 Add Language Support Check**

```typescript
/**
 * Check if we can translate between these languages
 */
async canTranslate(
  sourceLanguage: string,
  targetLanguage: string
): Promise<boolean> {
  try {
    const capabilities = await this.translator.canTranslate(
      sourceLanguage,
      targetLanguage
    );
    return capabilities.available !== 'no';
  } catch (error) {
    console.error(`❌ [Translation] Cannot check translation support:`, error);
    return false;
  }
}
```

### **Phase 5: Update AI Orchestrator (Priority: HIGH)**

**File**: `src/app/core/services/ai/ai-orchestrator.service.ts`

#### **5.1 Pass Language Parameters to Prompt API**

```typescript
async analyzeContract(
  contractText: string,
  userRole?: UserRole,
  contractLanguage = 'en',  // NEW
  outputLanguage = 'en'     // NEW
): Promise<ContractAnalysisResult> {
  const status = await this.checkAvailability();

  if (!status.prompt || !status.summarizer) {
    throw new Error(this.translate.instant('errors.aiServicesUnavailable'));
  }

  console.log(`✅ AI APIs available. Analyzing ${contractLanguage} contract...`);
  console.log(`📤 Output language: ${outputLanguage}`);

  // Create session with language context
  const session = await this.promptService.createSession({
    userRole,
    contractLanguage,
    outputLanguage
  });

  // Run analysis
  const clauses = await session.prompt(`Analyze this contract and respond with ONLY valid JSON following the schema provided in your system prompt.

Contract to analyze:
${contractText}

Remember: Output ONLY the JSON object, no markdown, no code blocks, no additional text.`);

  // Generate summary (in output language if supported)
  const summary = await this.summarizerService.generateExecutiveSummary(contractText);

  session.destroy();

  return {
    summary,
    clauses,
    contractText,
    analyzedAt: new Date(),
  };
}
```

---

## 🚨 Error Handling & Edge Cases

### **1. Unsupported Contract Language**

```typescript
// In contract-upload.ts or contract-analysis.service.ts
try {
  const canAnalyze = await this.canAnalyzeLanguage(detectedLanguage);

  if (!canAnalyze.canAnalyze) {
    this.showLanguageNotSupportedModal({
      language: detectedLanguage,
      error: canAnalyze.error,
      supportedLanguages: ['English', 'Spanish', 'Japanese'],
    });
    return;
  }
} catch (error) {
  // Handle error
}
```

### **2. Translation API Unavailable**

```typescript
if (needsTranslation) {
  const translationAvailable = await this.translator.isAvailable();

  if (!translationAvailable) {
    console.warn('⚠️ Translator API not available');
    // Fallback: Show analysis in English only
    // OR: Show error and suggest using English contract
  }
}
```

### **3. Partial Translation Failure**

```typescript
try {
  structuredAnalysis = await this.translationOrchestrator.translateAnalysis(
    structuredAnalysis,
    contractLanguage,
    outputLanguage
  );
} catch (error) {
  console.error('❌ Translation failed:', error);
  // Fallback: Show original language
  // Display error banner: "Translation failed - showing original English"
}
```

---

## 📊 Testing Strategy

### **Test Matrix**

| Contract Language | User Preferred | Gemini Nano Support | Translator Support | Expected Flow |
|---|---|---|---|---|
| English (en) | English (en) | ✅ Direct | N/A | Direct analysis, no translation |
| English (en) | Arabic (ar) | ✅ Direct | ✅ Yes | Analyze in EN, translate output to AR |
| Spanish (es) | English (en) | ✅ Direct | ✅ Yes | Analyze in ES, translate output to EN |
| Arabic (ar) | Arabic (ar) | ❌ No | ✅ Yes | Pre-translate to EN, analyze, translate output back to AR |
| French (fr) | English (en) | ⚠️ Limited | ✅ Yes | Pre-translate to EN, analyze, translate output to EN |
| Chinese (zh) | Chinese (zh) | ❌ No | ✅ Yes | Pre-translate to EN, analyze, translate output to ZH |

### **Test Cases**

#### **TC1: English → English (No Translation)**
```
Given: English contract, English UI
Expected: Direct analysis, no translation badge
```

#### **TC2: English → Arabic (Output Translation)**
```
Given: English contract, Arabic UI
Expected: Analyze in English, translate output to Arabic
Show: "Translated from English" badge
```

#### **TC3: Arabic → Arabic (Pre + Post Translation)**
```
Given: Arabic contract, Arabic UI
Expected:
1. Pre-translate contract to English
2. Analyze English version
3. Translate output back to Arabic
Show: "Contract translated for analysis" warning
```

#### **TC4: Arabic → English (Pre-Translation Only)**
```
Given: Arabic contract, English UI
Expected:
1. Pre-translate contract to English
2. Analyze English version
3. Show results in English (no post-translation)
Show: "Analyzed from Arabic" badge
```

---

## 🎯 Recommended Priority Order

### **Must Have** (Release Blocker)
1. ✅ Update system prompt with language instructions
2. ✅ Add language parameters to Prompt API session
3. ✅ Implement pre-translation for unsupported languages (Arabic, Chinese, etc.)
4. ✅ Add error handling for unsupported languages
5. ✅ Update language mismatch modal with warnings

### **Should Have** (Important)
6. ⏳ Add translation availability checks
7. ⏳ Update UI with translation status badges
8. ⏳ Test all language combinations
9. ⏳ Add fallback for translation failures

### **Nice to Have** (Enhancement)
10. ⏳ Cache translated contracts
11. ⏳ Add language quality indicators
12. ⏳ Support custom language models
13. ⏳ Add user feedback on translation quality

---

## 🔧 Configuration Recommendations

### **Add to app.config.ts**

```typescript
export const AppConfig = {
  // ... existing config ...

  ai: {
    // Languages that Gemini Nano can analyze directly
    supportedInputLanguages: ['en', 'es', 'ja'],

    // Languages that have good output support
    supportedOutputLanguages: ['en', 'es', 'ja'],

    // Whether to pre-translate unsupported contracts
    enablePreTranslation: true,

    // Whether to show warnings for unsupported languages
    showLanguageWarnings: true,

    // Fallback language when output language not supported
    fallbackLanguage: 'en',
  },
};
```

---

## 📝 i18n Updates Needed

Add these translation keys:

```json
{
  "language": {
    "limitedSupport": "Limited Language Support",
    "willTranslateForAnalysis": "This contract will be translated to English for analysis",
    "contractTranslatedForAnalysis": "Contract was translated for analysis",
    "analysisTranslated": "Analysis results have been translated",
    "translationFailed": "Translation failed - showing original",
    "unsupportedLanguage": "This language is not supported for contract analysis",
    "supportedLanguages": "Supported languages: English, Spanish, Japanese",
    "recommendUploadEnglish": "Please upload an English version of your contract"
  }
}
```

---

## 🎯 Summary & Next Steps

### **Current State**
- ✅ Translation infrastructure exists (TranslationOrchestrator)
- ✅ Language detection works
- ✅ Output translation works (for supported language pairs)
- ❌ Prompt API not configured for multi-language
- ❌ No pre-translation for unsupported input languages
- ❌ No error handling for unsupported languages

### **Key Decisions Needed**

1. **Do we support Arabic/Chinese contracts?**
   - **Option A**: Yes, via pre-translation (adds latency)
   - **Option B**: No, only English/Spanish/Japanese (simpler)
   - **Recommendation**: Option A with clear warnings

2. **What if Translator API is unavailable?**
   - **Option A**: Block analysis entirely
   - **Option B**: Allow English-only analysis
   - **Recommendation**: Option B with error message

3. **How to handle translation failures?**
   - **Option A**: Show error, block analysis
   - **Option B**: Fall back to English
   - **Recommendation**: Option B with warning banner

### **Implementation Order**

**Week 1: Core Functionality**
- Day 1-2: Update Prompt API with language parameters
- Day 3: Implement pre-translation for unsupported languages
- Day 4-5: Add error handling and fallbacks

**Week 2: UI & Testing**
- Day 6-7: Update language mismatch modal
- Day 8-9: Comprehensive testing
- Day 10: Bug fixes and polish

**Estimated Effort**: 2 weeks for full implementation

---

## ❓ Questions to Answer Before Implementation

1. **Budget**: How many Translator API calls can we afford per month?
2. **UX**: Should we auto-detect and pre-translate, or ask user first?
3. **Quality**: Is machine-translated legal analysis acceptable?
4. **Fallback**: What if both Prompt API and Translator API fail?
5. **Languages**: Should we limit to specific languages or support all?
6. **Caching**: Should we cache translated contracts to save API calls?
7. **Performance**: Is 2-3 second delay acceptable for translation?
8. **Transparency**: How much detail should we show about translation process?

---

**Ready to implement?** This document provides a complete roadmap for robust multilingual support. Review these recommendations, answer the key questions, and we can start implementing in phases. 🚀
