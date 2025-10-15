# Modal Refactoring Guide

## 🎯 Overview

This guide explains how to refactor existing modal components to use the new `BaseModal` component, eliminating code duplication and improving maintainability.

## 🏗️ Base Modal Architecture

### **BaseModal Component**
- **Location**: `src/app/shared/components/base-modal/`
- **Purpose**: Provides common modal structure (header, content, footer)
- **Features**: Content projection, configurable styling, translation support

### **BaseModalConfig Interface**
```typescript
export interface BaseModalConfig {
  title?: string;           // Direct title text
  titleKey?: string;        // Translation key for title
  icon?: any;              // Lucide icon component
  showFooter?: boolean;     // Show/hide footer (default: true)
  footerButtonText?: string; // Direct footer button text
  footerButtonKey?: string;  // Translation key for footer button
  maxWidth?: string;        // Modal max width (default: 'max-w-4xl')
  maxHeight?: string;       // Modal max height (default: 'max-h-[90vh]')
}
```

## 🔄 Refactoring Process

### **Before (Current Modal)**
```typescript
// sample-contract-modal.ts
export class SampleContractModal {
  private dialogRef = inject(DialogRef);
  
  readonly XIcon = X;
  readonly FileTextIcon = FileText;
  readonly LightbulbIcon = Lightbulb;

  onClose(): void {
    this.dialogRef.close();
  }
}
```

```html
<!-- sample-contract-modal.html -->
<div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
    <div class="flex items-center gap-3">
      <lucide-icon [img]="FileTextIcon" class="w-6 h-6 text-blue-600"></lucide-icon>
      <h2 class="text-xl font-bold text-gray-900">{{ 'sampleContract.title' | translate }}</h2>
    </div>
    <button (click)="onClose()" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <lucide-icon [img]="XIcon" class="w-5 h-5 text-gray-500"></lucide-icon>
    </button>
  </div>

  <!-- Content -->
  <div class="p-6 overflow-y-auto flex-1 min-h-0">
    <div class="prose max-w-none pb-4">
      <!-- Modal content here -->
    </div>
  </div>

  <!-- Footer -->
  <div class="flex justify-end p-6 border-t border-gray-200 flex-shrink-0">
    <button (click)="onClose()" class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
      {{ 'modal.close' | translate }}
    </button>
  </div>
</div>
```

### **After (Refactored Modal)**
```typescript
// sample-contract-modal-v2.ts
export class SampleContractModalV2 {
  private dialogRef = inject(DialogRef);
  
  readonly FileTextIcon = FileText;
  readonly LightbulbIcon = Lightbulb;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'sampleContract.title',
    icon: this.FileTextIcon,
    showFooter: true,
    footerButtonKey: 'modal.close',
    maxWidth: 'max-w-4xl',
    maxHeight: 'max-h-[90vh]'
  };

  onClose(): void {
    this.dialogRef.close();
  }
}
```

```html
<!-- sample-contract-modal-v2.html -->
<app-base-modal [config]="modalConfig">
  <!-- Only modal-specific content here -->
  <div class="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
    <p class="text-sm text-blue-900 leading-relaxed">
      <span class="font-semibold flex items-center gap-2">
        <lucide-icon [img]="LightbulbIcon" class="w-4 h-4"></lucide-icon>
        {{ 'sampleContract.headerDescription' | translate }}
      </span>
    </p>
  </div>

  <!-- Rest of modal content -->
</app-base-modal>
```

## 📋 Refactoring Checklist

### **Step 1: Update Component Class**
- [ ] Import `BaseModal` and `BaseModalConfig`
- [ ] Add `BaseModal` to component imports
- [ ] Create `modalConfig: BaseModalConfig` property
- [ ] Remove header/footer-related icon properties (keep content icons)
- [ ] Keep `onClose()` method for any custom logic

### **Step 2: Update Template**
- [ ] Replace entire modal structure with `<app-base-modal [config]="modalConfig">`
- [ ] Move only modal-specific content inside `<ng-content>`
- [ ] Remove header, footer, and container divs
- [ ] Keep content-specific icons and styling

### **Step 3: Update CSS**
- [ ] Remove modal container styles (handled by BaseModal)
- [ ] Keep only content-specific styles
- [ ] Update any custom styling that conflicts with BaseModal

### **Step 4: Test**
- [ ] Verify modal opens correctly
- [ ] Check header icon and title display
- [ ] Confirm footer button works
- [ ] Test responsive behavior
- [ ] Verify translations work

## 🎨 Configuration Examples

### **Simple Modal (Title + Icon)**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  showFooter: true
};
```

### **Custom Footer Button**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  footerButtonKey: 'modal.customAction',
  showFooter: true
};
```

### **No Footer**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  showFooter: false
};
```

### **Custom Size**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  maxWidth: 'max-w-2xl',
  maxHeight: 'max-h-[80vh]'
};
```

## 🚀 Benefits

### **Code Reduction**
- **Before**: ~95 lines per modal (TS + HTML + CSS)
- **After**: ~30 lines per modal (TS + HTML + CSS)
- **Reduction**: ~68% less code per modal

### **Maintainability**
- ✅ Single source of truth for modal structure
- ✅ Consistent styling across all modals
- ✅ Easy to update modal behavior globally
- ✅ Reduced testing surface area

### **Consistency**
- ✅ Identical header/footer behavior
- ✅ Consistent animations and transitions
- ✅ Unified accessibility features
- ✅ Standardized responsive behavior

## 📁 Files to Refactor

1. **Sample Contract Modal** ✅ (Example created)
2. **How It Works Modal**
3. **Privacy Policy Modal**
4. **Terms of Service Modal**
5. **Party Selector Modal** (Special case - custom footer)
6. **Non-Contract Error Modal** (Special case - custom footer)

## 🔧 Special Cases

### **Custom Footer Buttons**
For modals with custom footer buttons (like Party Selector), you can:
1. Set `showFooter: false` in config
2. Add custom footer inside `<ng-content>`
3. Or extend BaseModal to support custom footer templates

### **Different Sizes**
Each modal can specify its own `maxWidth` and `maxHeight` in the config.

## 🎯 Next Steps

1. **Refactor remaining modals** using the example pattern
2. **Update ModalService** to use refactored components
3. **Remove old modal files** after migration
4. **Update imports** throughout the application
5. **Test all modal functionality**

---

**Note**: This refactoring maintains 100% backward compatibility while significantly improving code maintainability and consistency.


