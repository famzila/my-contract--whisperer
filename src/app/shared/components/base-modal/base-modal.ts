import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { X } from '../../icons/lucide-icons';

export interface ActionButton {
  text?: string;
  textKey?: string; // Translation key for button text
  icon?: any; // Lucide icon component
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  callback: () => void;
}

export interface BaseModalConfig {
  title?: string;
  titleKey?: string; // Translation key for title
  icon?: any; // Lucide icon component
  showFooter?: boolean;
  footerButtonText?: string;
  footerButtonKey?: string; // Translation key for footer button (legacy - only used if no actionButtons)
  actionButtons?: ActionButton[]; // Custom action buttons provided by the consuming modal
  maxWidth?: string;
  maxHeight?: string;
}

@Component({
  selector: 'app-base-modal',
  imports: [LucideAngularModule, TranslatePipe],
  templateUrl: './base-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseModal {
  private dialogRef = inject(DialogRef);

  // Configuration inputs
  config = input.required<BaseModalConfig>();

  // Icons
  readonly XIcon = X;

  /**
   * Close modal
   */
  onClose(): void {
    this.dialogRef.close();
  }

  /**
   * Get modal container classes
   */
  getModalClasses(): string {
    const config = this.config();
    const maxWidth = config.maxWidth || 'max-w-4xl';
    const maxHeight = config.maxHeight || 'max-h-[90vh]';
    
    return `bg-white rounded-2xl shadow-2xl ${maxWidth} w-full ${maxHeight} flex flex-col`;
  }

  /**
   * Get footer button translation key with default
   */
  getFooterButtonKey(): string {
    const config = this.config();
    return config.footerButtonKey || 'modal.close';
  }

  /**
   * Check if footer should be shown (default: true)
   */
  shouldShowFooter(): boolean {
    const config = this.config();
    return config.showFooter !== false; // Default to true unless explicitly set to false
  }

  /**
   * Get title text
   */
  getTitle(): string {
    const config = this.config();
    return config.title || '';
  }

  /**
   * Get title translation key
   */
  getTitleKey(): string {
    const config = this.config();
    return config.titleKey || '';
  }

  /**
   * Get footer button text
   */
  getFooterButtonText(): string {
    const config = this.config();
    return config.footerButtonText || '';
  }

  /**
   * Get action buttons
   */
  getActionButtons(): ActionButton[] {
    const config = this.config();
    return config.actionButtons || [];
  }

  /**
   * Get button variant classes
   */
  getButtonClasses(variant: string = 'primary'): string {
    const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      case 'secondary':
        return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`;
      case 'danger':
        return `${baseClasses} bg-red-600 text-white hover:bg-red-700`;
      case 'ghost':
        return `${baseClasses} text-gray-600 hover:bg-gray-100`;
      default:
        return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
    }
  }

  /**
   * Handle action button click
   */
  onActionButtonClick(button: ActionButton): void {
    if (!button.disabled && button.callback) {
      button.callback();
    }
  }
}
