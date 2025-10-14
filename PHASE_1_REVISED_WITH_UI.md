# 📦 PHASE 1 REVISED: Schema Implementation with UI Updates

**Philosophy**: Update backend + UI together, test at each step
**Strategy**: Use feature flag to switch between old/new implementation
**Timeline**: 5-6 days

---

## 🎯 Implementation Strategy

### **Problem**
- Old code: Single monolithic JSON object parsed manually
- New code: Multiple schemas with structured responses
- UI expects old structure → Can't test new backend until UI updated

### **Solution: Dual Implementation with Feature Flag**

```typescript
// In app.config.ts
export const AppConfig = {
  useSchemaBasedAnalysis: false,  // Toggle to test new implementation
  // ... rest of config
};
```

This allows us to:
1. ✅ Implement new schemas alongside old code
2. ✅ Test new implementation without breaking existing
3. ✅ Update UI incrementally
4. ✅ Switch back if issues found
5. ✅ Remove old code once everything works

---

## 📅 Day-by-Day Plan

### **DAY 1: Create All Schemas**

**File**: `src/app/core/schemas/analysis-schemas.ts`

Create complete schemas file (see PHASE_1_ALL_SCHEMAS.md for full code)

**Test**: TypeScript compilation only

**Deliverable**: All schemas + types created

---

### **DAY 2: Add Schema Methods to Prompt Service**

**File**: `src/app/core/services/ai/prompt.service.ts`

Add new methods **alongside** existing ones (don't remove old yet):

```typescript
@Injectable({
  providedIn: 'root',
})
export class PromptService {
  // ========== OLD METHODS (Keep for now) ==========
  async extractClauses(contractText: string): Promise<string> {
    // ... existing code
  }

  // ========== NEW METHODS (Schema-based) ==========

  /**
   * Generic method to prompt with schema
   */
  private async promptWithSchema<T>(
    prompt: string,
    schema: object
  ): Promise<T> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    const resultString = await this.session.prompt(prompt, {
      responseConstraint: schema,
    });

    return JSON.parse(resultString) as T;
  }

  /**
   * NEW: Extract metadata with schema
   */
  async extractMetadataWithSchema(
    contractText: string
  ): Promise<Schemas.ContractMetadata> {
    const prompt = `Extract metadata from this contract:

${contractText}`;

    return this.promptWithSchema<Schemas.ContractMetadata>(
      prompt,
      Schemas.METADATA_SCHEMA
    );
  }

  /**
   * NEW: Extract risks with schema
   */
  async extractRisksWithSchema(
    contractText: string
  ): Promise<Schemas.RisksAnalysis> {
    const prompt = `Analyze risks in this contract:

${contractText}

Identify all risks, prioritize by severity (high, medium, low).`;

    return this.promptWithSchema<Schemas.RisksAnalysis>(
      prompt,
      Schemas.RISKS_SCHEMA
    );
  }

  // ... Add all 5 schema methods ...
}
```

**Test**:
- Write simple test to call each method
- Verify JSON structure matches schema

**Deliverable**: New methods working alongside old ones

---

### **DAY 3: Add Feature Flag to Analysis Service**

**File**: `src/app/core/services/contract-analysis.service.ts`

Add feature flag and new analysis path:

```typescript
import { AppConfig } from '../config/app.config';

@Injectable({
  providedIn: 'root',
})
export class ContractAnalysisService {

  async analyzeContract(
    parsedContract: ParsedContract,
    context?: AnalysisContext
  ): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
    const contract: Contract = { /* ... */ };

    // Check feature flag
    if (AppConfig.useSchemaBasedAnalysis) {
      console.log('🆕 Using schema-based analysis');
      return this.analyzeContractWithSchemas(parsedContract, context, contract);
    } else {
      console.log('🔄 Using legacy analysis');
      return this.analyzeContractLegacy(parsedContract, context, contract);
    }
  }

  /**
   * NEW: Schema-based analysis
   */
  private async analyzeContractWithSchemas(
    parsedContract: ParsedContract,
    context: AnalysisContext | undefined,
    contract: Contract
  ): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
    try {
      console.log('🔍 Starting schema-based analysis...');

      // Create session
      await this.promptService.createSession({
        userRole: context?.userRole,
        contractLanguage: context?.contractLanguage || 'en',
        outputLanguage: context?.analyzedInLanguage || 'en',
      });

      // Extract all sections with schemas (parallel)
      const [metadata, risks, obligations, omissionsAndQuestions, summaryStructured] =
        await Promise.all([
          this.promptService.extractMetadataWithSchema(parsedContract.text),
          this.promptService.extractRisksWithSchema(parsedContract.text),
          this.promptService.extractObligationsWithSchema(parsedContract.text),
          this.promptService.extractOmissionsAndQuestionsWithSchema(parsedContract.text),
          this.promptService.extractSummaryWithSchema(parsedContract.text),
        ]);

      console.log('✅ All schema extractions complete');

      // Build analysis object (convert schemas to existing model)
      const analysis: ContractAnalysis = {
        id: contract.id,
        summary: JSON.stringify({
          metadata,
          risks,
          obligations,
          omissionsAndQuestions,
          summary: summaryStructured,
        }, null, 2),
        clauses: this.convertRisksToClauses(risks.risks),
        riskScore: this.calculateRiskScoreFromRisks(risks.risks),
        obligations: this.convertObligationsToModel(obligations.obligations),
        omissions: omissionsAndQuestions.omissions,
        questions: omissionsAndQuestions.questions,
        metadata: metadata,
        disclaimer: summaryStructured.disclaimer,
        analyzedAt: new Date(),
      };

      this.promptService.destroy();
      return { contract, analysis };

    } catch (error) {
      console.error('❌ Schema-based analysis failed:', error);
      throw error;
    }
  }

  /**
   * OLD: Legacy analysis (keep for now)
   */
  private async analyzeContractLegacy(
    parsedContract: ParsedContract,
    context: AnalysisContext | undefined,
    contract: Contract
  ): Promise<{ contract: Contract; analysis: ContractAnalysis }> {
    // ... existing implementation (unchanged)
  }

  /**
   * Helper: Convert risks to clauses
   */
  private convertRisksToClauses(risks: Array<{
    title: string;
    severity: 'high' | 'medium' | 'low';
    icon: string;
    description: string;
    impact: string;
  }>): ContractClause[] {
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
   * Helper: Calculate risk score
   */
  private calculateRiskScoreFromRisks(risks: Array<any>): number {
    const weights = { high: 100, medium: 50, low: 25 };
    const total = risks.reduce((sum, risk) => sum + weights[risk.severity], 0);
    return Math.round(total / risks.length);
  }

  /**
   * Helper: Convert obligations
   */
  private convertObligationsToModel(obligations: {
    employer: Array<any>;
    employee: Array<any>;
  }): Obligation[] {
    const result: Obligation[] = [];

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
}
```

**Test**:
1. Set flag to `false` → Old flow works
2. Set flag to `true` → New flow works
3. Compare results side-by-side

**Deliverable**: Both implementations working, switchable via flag

---

### **DAY 4: Update UI for New Structure**

Now we can update the UI because we can test both versions!

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.ts`

Update to handle new schema structure:

```typescript
export class AnalysisDashboard implements OnInit {
  // ... existing code ...

  ngOnInit(): void {
    const analysis = this.contractStore.analysis();
    if (analysis) {
      this.parseAIResponse();
    }
  }

  /**
   * Parse AI response (supports both old and new format)
   */
  private parseAIResponse(): void {
    const analysis = this.contractStore.analysis();
    if (!analysis) return;

    try {
      const summaryText = typeof analysis.summary === 'string'
        ? analysis.summary
        : JSON.stringify(analysis.summary);

      const parsed = JSON.parse(summaryText);

      // Detect format: new schema-based or old format
      if (this.isNewSchemaFormat(parsed)) {
        this.parseNewSchemaFormat(parsed);
      } else {
        this.parseOldFormat(parsed);
      }

    } catch (error) {
      console.error('Failed to parse analysis:', error);
    }
  }

  /**
   * Check if this is new schema format
   */
  private isNewSchemaFormat(parsed: any): boolean {
    return parsed.hasOwnProperty('metadata') &&
           parsed.hasOwnProperty('risks') &&
           parsed.hasOwnProperty('obligations');
  }

  /**
   * Parse new schema-based format
   */
  private parseNewSchemaFormat(parsed: any): void {
    console.log('📊 Parsing new schema format');

    // Metadata
    if (parsed.metadata) {
      this.parsedMetadata.set({
        contractType: parsed.metadata.contractType,
        effectiveDate: parsed.metadata.effectiveDate,
        endDate: parsed.metadata.endDate,
        jurisdiction: parsed.metadata.jurisdiction,
        parties: parsed.metadata.parties,
      });
    }

    // Risks (with Lucide icons!)
    if (parsed.risks?.risks) {
      this.parsedRisks.set(
        parsed.risks.risks.map((risk: any) => ({
          title: risk.title,
          severity: risk.severity,
          icon: risk.icon,  // NEW: Lucide icon name
          description: risk.description,
          impact: risk.impact,
        }))
      );
    }

    // Obligations
    if (parsed.obligations?.obligations) {
      this.parsedObligations.set({
        employer: parsed.obligations.obligations.employer || [],
        employee: parsed.obligations.obligations.employee || [],
      });
    }

    // Omissions
    if (parsed.omissionsAndQuestions?.omissions) {
      this.parsedOmissions.set(parsed.omissionsAndQuestions.omissions);
    }

    // Questions
    if (parsed.omissionsAndQuestions?.questions) {
      this.parsedQuestions.set(parsed.omissionsAndQuestions.questions);
    }

    // Summary
    if (parsed.summary?.summary) {
      this.parsedSummary.set(parsed.summary.summary);
    }

    console.log('✅ New schema format parsed successfully');
  }

  /**
   * Parse old format (fallback)
   */
  private parseOldFormat(parsed: any): void {
    console.log('📊 Parsing old format (legacy)');

    // ... existing parsing logic ...

    console.log('✅ Old format parsed successfully');
  }
}
```

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.html`

Update risk rendering to use Lucide icons:

```html
<!-- Risks Section -->
<div class="space-y-4">
  @for (risk of parsedRisks(); track $index) {
    <div class="p-4 rounded-lg border"
         [class]="getRiskBorderClass(risk.severity)">

      <div class="flex items-start gap-3 rtl:flex-row-reverse">
        <!-- NEW: Use Lucide icon instead of emoji -->
        <div class="flex-shrink-0">
          <lucide-icon
            [img]="getRiskIcon(risk.icon)"
            class="w-6 h-6"
            [class]="getRiskIconColorClass(risk.severity)">
          </lucide-icon>
        </div>

        <div class="flex-1">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold text-gray-900">{{ risk.title }}</h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full"
                  [class]="getRiskBadgeClass(risk.severity)">
              {{ risk.severity | uppercase }}
            </span>
          </div>

          <p class="text-sm text-gray-700 mb-2">{{ risk.description }}</p>

          @if (risk.impact) {
            <div class="mt-2 p-3 bg-gray-50 rounded-lg">
              <p class="text-sm text-gray-600">
                <strong>Impact:</strong> {{ risk.impact }}
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  }
</div>
```

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.ts`

Add helper methods for icons:

```typescript
import { AlertTriangle, AlertCircle, Info } from 'lucide-angular';

export class AnalysisDashboard {
  // Lucide icons
  AlertTriangleIcon = AlertTriangle;
  AlertCircleIcon = AlertCircle;
  InfoIcon = Info;

  /**
   * Get Lucide icon component from icon name
   */
  getRiskIcon(iconName: string): any {
    const iconMap: Record<string, any> = {
      'alert-triangle': AlertTriangle,
      'alert-circle': AlertCircle,
      'info': Info,
    };
    return iconMap[iconName] || AlertCircle;
  }

  /**
   * Get icon color class based on severity
   */
  getRiskIconColorClass(severity: string): string {
    const colorMap: Record<string, string> = {
      'high': 'text-red-500',
      'medium': 'text-orange-500',
      'low': 'text-blue-500',
    };
    return colorMap[severity] || 'text-gray-500';
  }

  // ... rest of methods ...
}
```

**Test**:
1. Set flag to `true`
2. Upload contract
3. Verify UI displays correctly with Lucide icons
4. Check all tabs work

**Deliverable**: UI working with new schema format

---

### **DAY 5: Test Both Implementations**

**Testing Checklist**:

1. **Old Implementation** (flag = `false`):
   - [ ] Upload contract
   - [ ] All tabs render correctly
   - [ ] Risks show with emojis (old format)
   - [ ] No errors in console

2. **New Implementation** (flag = `true`):
   - [ ] Upload contract
   - [ ] All tabs render correctly
   - [ ] Risks show with Lucide icons (new format)
   - [ ] No JSON parse errors
   - [ ] Console shows "schema-based analysis"

3. **Compare Results**:
   - [ ] Same risks identified
   - [ ] Same obligations found
   - [ ] Same questions generated
   - [ ] Risk scores similar

4. **Edge Cases**:
   - [ ] Empty contract
   - [ ] Invalid contract
   - [ ] Very long contract
   - [ ] Multiple uploads in sequence

**Deliverable**: Confidence that new implementation works correctly

---

### **DAY 6: Enable New Implementation & Clean Up**

**Step 6.1: Enable Schema-Based Analysis**

**File**: `src/app/core/config/app.config.ts`

```typescript
export const AppConfig = {
  useSchemaBasedAnalysis: true,  // ✅ Enable new implementation
  // ... rest
};
```

**Step 6.2: Remove Old Code**

Once we're confident the new implementation works:

**File**: `src/app/core/services/ai/prompt.service.ts`
- ❌ Remove `extractClauses()` method
- ❌ Remove JSON cleanup code
- ✅ Keep only schema-based methods

**File**: `src/app/core/services/contract-analysis.service.ts`
- ❌ Remove `analyzeContractLegacy()` method
- ❌ Remove `parseClausesFromJSON()`
- ❌ Remove `parseClausesFromAI()`
- ❌ Remove `extractClausesFromText()`
- ❌ Remove `parseObligationsFromJSON()`
- ❌ Remove `extractObligationsFromText()`
- ✅ Rename `analyzeContractWithSchemas()` to `analyzeContract()`

**File**: `src/app/features/analysis-dashboard/analysis-dashboard.ts`
- ❌ Remove `parseOldFormat()` method
- ❌ Remove `isNewSchemaFormat()` check
- ✅ Keep only `parseNewSchemaFormat()`

**Estimated Lines Removed**: ~500-600 lines

**Test**: Final smoke test with new implementation only

**Deliverable**: Clean codebase with only schema-based implementation

---

## 📊 Summary

### **Days 1-2: Backend (Schemas + Methods)**
- Create all schemas
- Add all extraction methods
- No breaking changes yet

### **Day 3: Feature Flag**
- Add new analysis path alongside old
- Switchable via config flag
- Both implementations work

### **Day 4: UI Updates**
- Update dashboard to handle both formats
- Add Lucide icon rendering
- Test with new format

### **Day 5: Testing**
- Compare old vs new side-by-side
- Verify no regressions
- Build confidence

### **Day 6: Clean Up**
- Enable new implementation
- Remove old code
- Ship clean codebase

---

## ✅ Benefits of This Approach

1. **Testable**: Can test new code without breaking old
2. **Reversible**: Can switch back if issues found
3. **Incremental**: UI updated in sync with backend
4. **Safe**: No "big bang" deployment
5. **Clean**: Old code removed only after validation

---

## 🚀 Ready to Start?

This approach lets you test properly at each step. Start with Day 1?
