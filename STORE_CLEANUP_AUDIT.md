# Contract Store Cleanup Audit

## 🔍 Analysis Flow Audit (Current State)

### ✅ **Current Implementation (RxJS Streaming)**
The app uses **progressive RxJS streaming** where:
1. Each section (metadata, summary, risks, obligations, omissions/questions) is extracted independently
2. Results are stored in `SectionState<T>` objects in the store
3. UI displays results as they arrive (progressive loading)

### ❌ **Legacy Code to Remove**

#### 1. **`analysis` Property** (UNUSED)
- **Location**: `ContractState.analysis: ContractAnalysis | null`
- **Status**: ❌ **NEVER SET** in current implementation
- **Impact**: Causes confusion between `analysis()?.metadata` vs `sectionsMetadata()?.data`
- **Dependencies**: Used in old computed signals that should be removed

#### 2. **Legacy Computed Signals** (BASED ON REMOVED `analysis`)
These computed signals depend on the unused `analysis` property:
- `hasAnalysis` - ❌ Remove (use `canShowDashboard` instead)
- `riskScore` - ❌ Remove (not calculated in new approach)
- `hasHighRiskClauses` - ❌ Remove  
- `highRiskClauses` - ❌ Remove (risks are in `sectionsRisks`)
- `mediumRiskClauses` - ❌ Remove
- `lowRiskClauses` - ❌ Remove
- `riskCounts` - ❌ Remove
- `pendingObligations` - ❌ Remove (obligations structure is different)
- `completedObligations` - ❌ Remove

#### 3. **Legacy Methods**
- `setAnalysis()` - ❌ Remove (never called)
- `toggleObligation()` - ❌ Remove (not part of current UX)

#### 4. **UI State** (QUESTIONABLE)
- `selectedClauseId` - ❓ Check if used (likely not)
- `selectClause()`, `clearSelectedClause()` - ❓ Check if used

#### 5. **Deprecated Flag**
- `useProgressiveLoading` - ❌ Remove (always true now)

---

## 📊 **Type Conflicts & Missing Types**

### Current Type Issues:

1. **`SectionState<any>`** - Uses `any` instead of proper types
   ```typescript
   // ❌ Bad
   sectionsMetadata: SectionState<any> | null;
   
   // ✅ Good
   sectionsMetadata: SectionState<ContractMetadata> | null;
   ```

2. **Missing Type Imports**
   - Should import from `analysis-schemas.ts`:
     - `ContractMetadata`
     - `RisksAnalysis`
     - `ObligationsAnalysis`
     - `OmissionsAndQuestions`
     - `ContractSummary`

3. **`ContractAnalysis` Type** - Legacy type, check if can be removed entirely

---

## ✅ **What to Keep**

### Core State:
- ✅ `contract: Contract | null` - Current contract
- ✅ `isUploading: boolean` - Upload state
- ✅ `isAnalyzing: boolean` - Analysis state (used during metadata extraction)
- ✅ `uploadError: string | null` - Error handling
- ✅ `analysisError: string | null` - Error handling

### Progressive Loading State:
- ✅ `analysisProgress: number` - Progress percentage (0-100)
- ✅ `sectionsMetadata: SectionState<ContractMetadata> | null`
- ✅ `sectionsSummary: SectionState<ContractSummary> | null`
- ✅ `sectionsRisks: SectionState<RisksAnalysis> | null`
- ✅ `sectionsObligations: SectionState<ObligationsAnalysis> | null`
- ✅ `sectionsOmissionsQuestions: SectionState<OmissionsAndQuestions> | null`
- ✅ `destroySubject: Subject<void> | null` - RxJS cleanup

### Computed Signals:
- ✅ `hasContract` - Check if contract exists
- ✅ `canShowDashboard` - Check if enough data to show dashboard
- ✅ `isLoading` - Check if uploading or analyzing
- ✅ `hasError` - Check for any errors
- ✅ `isAnySectionLoading` - Check if any section is still loading

### Methods:
- ✅ `setContract()` - Set current contract
- ✅ `setUploading()` - Set upload state
- ✅ `setAnalyzing()` - Set analysis state
- ✅ `setUploadError()` - Set upload error
- ✅ `setAnalysisError()` - Set analysis error
- ✅ `clearErrors()` - Clear all errors
- ✅ `parseAndAnalyzeFile()` - Parse and validate file
- ✅ `parseAndAnalyzeText()` - Parse and validate text
- ✅ `analyzeContract()` - Main analysis orchestration (RxJS streaming)
- ✅ `reset()` - Reset to initial state

---

## 🎯 **Cleanup Action Plan**

### Phase 1: Remove Legacy State & Methods
1. Remove `analysis` property from state
2. Remove `setAnalysis()` method
3. Remove all `analysis`-dependent computed signals
4. Remove `toggleObligation()` method
5. Remove `selectedClauseId` and related methods (if unused)
6. Remove `useProgressiveLoading` flag

### Phase 2: Fix Type Safety
1. Import proper types from `analysis-schemas.ts`
2. Replace `SectionState<any>` with specific types
3. Update `SectionState` interface to use generics properly
4. Remove `ContractAnalysis` import if no longer needed

### Phase 3: Simplify Computed Signals
1. Keep only active computed signals
2. Ensure all computed signals reference correct sources

### Phase 4: Update Dashboard Component
1. Remove any references to `analysis()` property
2. Use only `sectionsXxx()` for data access
3. Update any remaining computed that rely on old structure

---

## 📝 **Before/After Comparison**

### Before (Confusing):
```typescript
// ❌ Which one to use?
const metadata1 = this.contractStore.analysis()?.metadata;
const metadata2 = this.contractStore.sectionsMetadata()?.data;
```

### After (Clear):
```typescript
// ✅ Only one way
const metadata = this.contractStore.sectionsMetadata()?.data;
```

---

## ⚠️ **Breaking Changes**

### Removed Properties:
- `analysis()` - Use section-specific getters
- `hasAnalysis()` - Use `canShowDashboard()`
- `riskScore()` - Calculate from `sectionsRisks()?.data`
- All clause-specific computed signals

### Removed Methods:
- `setAnalysis()` - No longer needed
- `toggleObligation()` - Not part of current UX

---

## ✅ **Testing Checklist**

After cleanup:
- [ ] Upload page still works
- [ ] Analysis page loads with metadata
- [ ] Progressive loading displays correctly
- [ ] All tabs show correct data
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Build succeeds


