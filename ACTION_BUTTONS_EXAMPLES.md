# Action Buttons Configuration Examples

## 🎯 Overview

The `BaseModal` component supports highly configurable action buttons through the `actionButtons` array in the `BaseModalConfig`. Each modal can define its own custom action buttons with different variants, icons, and callbacks.

## 🏗️ ActionButton Interface

```typescript
export interface ActionButton {
  text?: string;           // Direct button text
  textKey?: string;        // Translation key for button text
  icon?: any;             // Lucide icon component
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;      // Disable button state
  callback: () => void;    // Function to execute on click
}
```

## 🎨 Button Variants

- **`primary`**: Blue background, white text (default)
- **`secondary`**: Gray background, dark text
- **`danger`**: Red background, white text
- **`ghost`**: Transparent background, gray text

## 📋 Usage Examples

### **1. Simple Close Button (Legacy)**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  showFooter: true,
  footerButtonKey: 'modal.close' // Uses legacy close button
};
```

### **2. Single Action Button**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  showFooter: true,
  actionButtons: [
    {
      textKey: 'modal.close',
      variant: 'primary',
      callback: () => this.onClose()
    }
  ]
};
```

### **3. Multiple Action Buttons**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'sampleContract.title',
  icon: this.FileTextIcon,
  showFooter: true,
  actionButtons: [
    {
      textKey: 'sampleContract.copyContract',
      icon: this.CopyIcon,
      variant: 'secondary',
      callback: () => this.copyContract()
    },
    {
      textKey: 'sampleContract.downloadContract',
      icon: this.DownloadIcon,
      variant: 'primary',
      callback: () => this.downloadContract()
    },
    {
      textKey: 'modal.close',
      variant: 'ghost',
      callback: () => this.onClose()
    }
  ]
};
```

### **4. Email Draft Modal (Future Use Case)**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'emailDraft.title',
  icon: this.MailIcon,
  showFooter: true,
  actionButtons: [
    {
      textKey: 'emailDraft.discard',
      icon: this.TrashIcon,
      variant: 'danger',
      callback: () => this.discardDraft()
    },
    {
      textKey: 'emailDraft.saveDraft',
      icon: this.SaveIcon,
      variant: 'secondary',
      callback: () => this.saveDraft()
    },
    {
      textKey: 'emailDraft.sendEmail',
      icon: this.SendIcon,
      variant: 'primary',
      callback: () => this.sendEmail()
    }
  ]
};
```

### **5. Confirmation Modal**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'confirmation.title',
  icon: this.AlertTriangleIcon,
  showFooter: true,
  actionButtons: [
    {
      textKey: 'common.cancel',
      variant: 'ghost',
      callback: () => this.onCancel()
    },
    {
      textKey: 'common.confirm',
      icon: this.CheckIcon,
      variant: 'danger',
      callback: () => this.onConfirm()
    }
  ]
};
```

### **6. Form Modal with Validation**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'form.title',
  icon: this.EditIcon,
  showFooter: true,
  actionButtons: [
    {
      textKey: 'common.cancel',
      variant: 'ghost',
      callback: () => this.onCancel()
    },
    {
      textKey: 'form.reset',
      icon: this.RefreshIcon,
      variant: 'secondary',
      disabled: this.isFormEmpty(),
      callback: () => this.resetForm()
    },
    {
      textKey: 'form.submit',
      icon: this.CheckIcon,
      variant: 'primary',
      disabled: !this.isFormValid(),
      callback: () => this.submitForm()
    }
  ]
};
```

### **7. No Footer**
```typescript
readonly modalConfig: BaseModalConfig = {
  titleKey: 'modal.title',
  icon: this.SomeIcon,
  showFooter: false // No footer at all
};
```

## 🔧 Implementation Pattern

### **Step 1: Define Action Buttons in Modal Component**
```typescript
export class MyModal {
  private dialogRef = inject(DialogRef);

  // Icons for buttons
  readonly SaveIcon = Save;
  readonly CancelIcon = X;
  readonly DeleteIcon = Trash;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'myModal.title',
    icon: this.SomeIcon,
    showFooter: true,
    actionButtons: [
      {
        textKey: 'common.cancel',
        icon: this.CancelIcon,
        variant: 'ghost',
        callback: () => this.onCancel()
      },
      {
        textKey: 'myModal.save',
        icon: this.SaveIcon,
        variant: 'primary',
        callback: () => this.onSave()
      }
    ]
  };

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    // Save logic here
    console.log('Saving...');
  }
}
```

### **Step 2: Use in Template**
```html
<app-base-modal [config]="modalConfig">
  <!-- Modal content here -->
  <div class="space-y-4">
    <!-- Your modal-specific content -->
  </div>
</app-base-modal>
```

## 🎯 Benefits

### **✅ Highly Customizable**
- Each modal defines its own action buttons
- Different variants for different actions
- Icons and text can be customized per button
- Disabled state support

### **✅ Consistent Styling**
- All buttons use the same base styles
- Consistent hover and focus states
- Proper spacing and alignment

### **✅ Translation Support**
- Both direct text and translation keys supported
- Easy internationalization

### **✅ Accessibility**
- Proper button semantics
- Disabled state handling
- Keyboard navigation support

## 🚀 Future Use Cases

### **Email Draft Modal**
- **Discard**: Red button to discard changes
- **Save Draft**: Secondary button to save as draft
- **Send Email**: Primary button to send email

### **Contract Review Modal**
- **Reject**: Red button to reject contract
- **Request Changes**: Secondary button to request modifications
- **Approve**: Primary button to approve contract

### **Settings Modal**
- **Reset**: Secondary button to reset to defaults
- **Cancel**: Ghost button to cancel changes
- **Save**: Primary button to save settings

---

**Note**: The `actionButtons` array completely replaces the legacy `footerButtonKey` when provided. If no `actionButtons` are provided, the modal falls back to the legacy close button behavior.


