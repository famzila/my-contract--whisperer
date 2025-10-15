# 🌍 Translation Implementation Plan - Execution Guide

**Date**: October 15, 2025  
**Status**: 🚧 In Progress  
**Objective**: Implement robust multilingual support with app UI language synchronized to analysis results

---

## 🎯 Core Principle

```
GOLDEN RULE: analysisLanguage === appUILanguage
```

**No mixed languages allowed!**

---

## 📋 Implementation Phases

### ✅ Phase 0: Language Synchronization (CRITICAL)
**Status**: 🔄 In Progress  
**Files**:
- `src/app/core/constants/languages.ts` - Add Gemini Nano support constants
- `src/app/core/stores/language.store.ts` - Add synchronization logic
- `src/app/shared/components/language-mismatch-modal/language-mismatch-modal.ts` - Update modal

**Tasks**:
- [x] Add `GEMINI_NANO_SUPPORTED_LANGUAGES` constant
- [ ] Add `setAnalysisLanguage()` method to language store
- [ ] Update `LanguageMismatchData` interface with new properties
- [ ] Update modal template to use Lucide icons (no emojis)
- [ ] Add UI availability warnings in modal
- [ ] Implement language switching logic

---

### ✅ Phase 1: Update Prompt Service
**Status**: ✅ Complete  
**Files**:
- `src/app/core/services/ai/prompt.service.ts`
- `src/app/core/models/ai.types.ts`
- `src/app/core/services/contract-analysis.service.ts`

**Tasks**:
- [x] Add `contractLanguage` and `outputLanguage` parameters to `createSession()`
- [x] Create `buildLanguageInstructions()` method
- [x] Add `getLanguageName()` helper (supports 17 languages)
- [x] Configure `expectedInputs` and `expectedOutputs` using official Chrome AI API format
- [x] Add `AIExpectedInput` and `AIExpectedOutput` interfaces to `ai.types.ts`
- [x] Update all extraction methods to accept `outputLanguage` parameter
- [x] Update Observable versions (`extractMetadata$`, `extractRisks$`, etc.)
- [x] Update `contract-analysis.service.ts` to pass `outputLanguage` to all extractions
- [x] Add language info to console logs for debugging

**Implementation Details**:
```typescript
// Official Chrome AI API format
expectedInputs: [
  {
    type: 'text',
    languages: ['en', 'ja'] // System prompt (en) + contract language (ja)
  }
],
expectedOutputs: [
  {
    type: 'text',
    languages: ['ja'] // Output in Japanese
  }
]
```

---

### ✅ Phase 2: Handle Unsupported Input Languages
**Status**: ✅ Complete  
**Files**:
- `src/app/core/services/contract-analysis.service.ts`

**Tasks**:
- [x] Add pre-translation logic for unsupported languages
- [x] Create `canAnalyzeLanguage()` method
- [x] Update analysis flow to handle pre-translation
- [x] Add error handling for unsupported languages
- [x] Ensure app UI switches correctly after pre-translation

**Implementation Details**:
- Split `analyzeContractStreaming$` into two paths:
  - `analyzeDirectly$`: For supported languages (en, es, ja)
  - `analyzeWithPreTranslation$`: For unsupported languages (ar, fr, de, zh, etc.)
- Pre-translation flow:
  1. Translate contract from original language → English
  2. Analyze in English with Gemini Nano
  3. Output results in target language (via expectedOutputs)
- Uses Chrome Translator API for pre-translation
- Maintains RxJS streaming architecture
- All sections stream independently after metadata

---

### ✅ Phase 3: Post-Translation (Integrated into Phase 2)
**Status**: ✅ Complete  
**Files**:
- `src/app/core/services/contract-analysis.service.ts`

**Tasks**:
- [x] Add post-translation logic for all sections
- [x] Create `postTranslateMetadata()` method
- [x] Create `postTranslateSummary()` method
- [x] Create `postTranslateRisks()` method
- [x] Create `postTranslateObligations()` method
- [x] Create `postTranslateOmissionsAndQuestions()` method
- [x] Integrate post-translation into RxJS streaming flow

**Implementation Details**:
- Post-translation happens after each section is extracted in English
- Uses Chrome Translator API (`translateFromEnglish`)
- Translates all text fields while preserving structure
- Maintains RxJS streaming architecture
- Only translates when `targetLanguage !== 'en'`

---

### ⏳ Phase 4: Update AI Orchestrator
**Status**: ⏳ Pending  
**Files**:
- `src/app/core/services/ai/ai-orchestrator.service.ts`

**Tasks**:
- [ ] Add language parameters to `analyzeContract()`
- [ ] Pass language context to Prompt API
- [ ] Update logging

---

### ⏳ Phase 5: i18n Updates
**Status**: ⏳ Pending  
**Files**:
- `public/i18n/*.json`

**Tasks**:
- [ ] Add new translation keys for all languages
- [ ] Update existing keys if needed

---

## 🎨 Design Guidelines

### Icons (Use Lucide, NOT Emojis)
```html
<!-- ❌ BAD: Using emojis -->
<span>⚠️</span>
<span>✅</span>

<!-- ✅ GOOD: Using Lucide icons -->
<lucide-icon [img]="AlertTriangleIcon" class="w-5 h-5 text-yellow-600"></lucide-icon>
<lucide-icon [img]="CheckCircleIcon" class="w-5 h-5 text-green-600"></lucide-icon>
```

### Available Lucide Icons for Translation UI
- `Globe` - Language/translation
- `AlertTriangle` - Warnings
- `AlertCircle` - Info warnings
- `CheckCircle` / `CircleCheckBig` - Success
- `Info` - Information
- `Languages` - Language switching
- `ArrowRightLeft` - Translation/switching

---

## 📊 Language Support Matrix

| Language | Code | App UI | Gemini Nano | Strategy |
|----------|------|--------|-------------|----------|
| English | en | ✅ | ✅ Direct | Direct analysis |
| Spanish | es | ✅ | ✅ Direct | Direct analysis |
| Japanese | ja | ✅ | ✅ Direct | Direct analysis |
| French | fr | ✅ | ⚠️ Limited | Pre-translate to EN |
| Arabic | ar | ✅ | ❌ No | Pre-translate to EN |
| German | de | ✅ | ⚠️ Limited | Pre-translate to EN |
| Chinese | zh | ✅ | ❌ No | Pre-translate to EN |
| Korean | ko | ❌ | ❌ No | Force English |

---

## 🔄 Language Flow Examples

### Example 1: Arabic Contract
```
1. User uploads Arabic contract
2. Detect: Arabic (ar)
3. Check: Arabic in SUPPORTED_APP_LANGUAGES? YES ✅
4. Check: Gemini Nano supports Arabic? NO ❌
5. Modal shows: "Analyze in Arabic" with warning badge
6. User selects: "Analyze in Arabic"
7. App switches to Arabic UI
8. Pre-translate: Arabic → English
9. Analyze in English (Gemini Nano)
10. Post-translate: English → Arabic
11. Display Arabic results in Arabic UI ✅
```

### Example 2: Korean Contract
```
1. User uploads Korean contract
2. Detect: Korean (ko)
3. Check: Korean in SUPPORTED_APP_LANGUAGES? NO ❌
4. Modal shows: Only "Analyze in English" option
5. Warning: "Korean UI not available"
6. User confirms
7. App stays in English
8. Pre-translate: Korean → English
9. Analyze in English
10. Display English results in English UI ✅
```

---

## 🧪 Testing Checklist

### Phase 0 Testing
- [ ] English contract → English UI (no switch)
- [ ] Arabic contract → Arabic UI (switch)
- [ ] Korean contract → English UI (no switch, warning shown)
- [ ] Language switching works correctly
- [ ] RTL support works for Arabic
- [ ] All icons display correctly (no emojis)

### Full Integration Testing
- [ ] All language combinations from matrix
- [ ] Pre-translation works
- [ ] Post-translation works
- [ ] Error handling for unsupported languages
- [ ] Error handling for translation failures
- [ ] App UI always matches analysis language

---

## 📝 Commit Strategy

Each phase will have its own commit:
- `feat: add language synchronization (Phase 0)`
- `feat: add multilingual prompt support (Phase 1)`
- `feat: add pre-translation for unsupported languages (Phase 2)`
- `feat: enhance translation orchestrator (Phase 3)`
- `feat: add language parameters to AI orchestrator (Phase 4)`
- `feat: add translation i18n keys (Phase 5)`

---

## 🎯 Current Progress

**Phase 0**: Starting now...

