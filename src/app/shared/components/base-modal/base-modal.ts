import { ChangeDetectionStrategy, Component, inject, input, computed, effect } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { X } from '../../icons/lucide-icons';
import { Button } from '../button/button';
import { LanguageStore } from '../../../core/stores/language.store';

export interface ActionButton {
  text?: string;
  textKey?: string;
  icon?: any;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  callback: () => void;
}

export interface BaseModalConfig {
  title?: string;
  titleKey?: string;
  icon?: any;
  showFooter?: boolean;
  footerButtonText?: string;
  footerButtonKey?: string;
  actionButtons?: ActionButton[];
  maxWidth?: string;
  maxHeight?: string;
}

@Component({
  selector: 'app-base-modal',
  imports: [LucideAngularModule, TranslatePipe, Button],
  templateUrl: './base-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BaseModal {
  private dialogRef = inject(DialogRef);
  private readonly languageStore = inject(LanguageStore);

  // Configuration inputs
  config = input.required<BaseModalConfig>();

  // Icons
  readonly XIcon = X;

  // Expose RTL as a computed signal for the template
  // This makes zoneless track changes automatically
  isRTL = computed(() => this.languageStore.isRTL());

  /**
   * Close modal
   */
  onClose(): void {
    this.dialogRef.close();
  }

  /**
   * Get modal container classes
   */
  modalClasses = computed(() => {
    const config = this.config();
    const maxWidth = config.maxWidth || 'max-w-4xl';
    const maxHeight = config.maxHeight || 'max-h-[90vh]';
    
    return `bg-white rounded-2xl shadow-2xl ${maxWidth} w-full ${maxHeight} flex flex-col`;
  });

  /**
   * Header classes - uses flex-row-reverse for RTL
   */
  headerClasses = computed(() => {
    const isRTL = this.isRTL();
    const baseClasses = 'flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-2xl';
    return isRTL ? `${baseClasses} flex-row-reverse` : baseClasses;
  });

  /**
   * Header content classes - icon and title container
   */
  headerContentClasses = computed(() => {
    const isRTL = this.isRTL();
    const baseClasses = 'flex items-center gap-3';
    return isRTL ? `${baseClasses} flex-row-reverse` : baseClasses;
  });

  /**
   * Footer classes - reverses button order for RTL
   */
  footerClasses = computed(() => {
    const isRTL = this.isRTL();
    const baseClasses = 'flex gap-3 p-6 border-t border-gray-200 flex-shrink-0 rounded-b-2xl';
    // In RTL, we want buttons on the left (which visually appears as right in RTL context)
    const alignment = isRTL ? 'justify-start' : 'justify-end';
    return `${baseClasses} ${alignment}`;
  });

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
    return config.showFooter !== false;
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
   * Handle action button click
   */
  onActionButtonClick(button: ActionButton): void {
    if (!button.disabled && button.callback) {
      button.callback();
    }
  }
}