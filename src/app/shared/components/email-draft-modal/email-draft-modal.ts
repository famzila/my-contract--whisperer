import { ChangeDetectionStrategy, Component, inject, input, signal, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { Mail, Copy, RefreshCw, X, Check, Info, SlidersVertical, Sparkles } from '../../icons/lucide-icons';
import { Button } from '../button/button';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';
import { EmailDraftStore } from '../../../core/stores/email-draft.store';
import { LanguageStore } from '../../../core/stores/language.store';
import { Notice } from '../notice/notice';

export interface EmailDraftData {
  emailContent: string;
  isRewriting: boolean;
  showRewriteOptions: boolean;
  rewriteOptions: {
    tone: string;
    length: string;
    formality: string;
  };
}

@Component({
  selector: 'app-email-draft-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Button, LoadingSpinner, Notice],
  templateUrl: './email-draft-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailDraftModal {
  private dialogRef = inject(DialogRef);
  private emailStore = inject(EmailDraftStore);
  private languageStore = inject(LanguageStore);

  // Inputs (can be provided via DIALOG_DATA or inputs)
  emailContent = input<string>('');
  isRewriting = input<boolean>(false);
  showRewriteOptions = input<boolean>(false);
  rewriteOptions = input<any>({});

  // Computed signals for email language and RTL/LTR handling
  protected emailDirection = computed(() => {
    const emailLang = this.emailStore.emailLanguage();
    if (!emailLang) return 'ltr';
    return this.languageStore.isRTLLanguage(emailLang) ? 'rtl' : 'ltr';
  });
  
  protected emailLanguageInfo = computed(() => {
    const emailLang = this.emailStore.emailLanguage();
    const languages = this.languageStore.availableLanguages();
    return languages.find(l => l.code === emailLang) || null;
  });

  // Icons
  readonly MailIcon = Mail;
  readonly CopyIcon = Copy;
  readonly RefreshCwIcon = RefreshCw;
  readonly XIcon = X;
  readonly CheckIcon = Check;
  readonly SparklesIcon = Sparkles;
  readonly InfoIcon = Info;
  readonly SlidersVerticalIcon = SlidersVertical;

  // Copy button state
  copyButtonState = signal<'copy' | 'copied'>('copy');

  // Base modal configuration with custom action buttons
  get modalConfig(): BaseModalConfig {
    return {
      titleKey: 'analysis.email.modalTitle',
      icon: this.MailIcon,
      maxWidth: 'max-w-3xl',
      showFooter: true,
      actionButtons: [
        {
          textKey: 'common.close',
          icon: this.XIcon,
          variant: 'secondary',
          callback: () => this.onClose()
        },
        {
          textKey: this.copyButtonState() === 'copy' ? 'common.copy' : 'common.copied',
          icon: this.copyButtonState() === 'copy' ? this.CopyIcon : this.CheckIcon,
          variant: this.copyButtonState() === 'copy' ? 'primary' : 'secondary',
          callback: () => this.onCopy()
        }
      ]
    };
  }

  /**
   * Get email content from store
   */
  get emailText(): string {
    return this.emailStore.draftedEmail() || '';
  }

  /**
   * Get rewriting state from store
   */
  get isCurrentlyRewriting(): boolean {
    return this.emailStore.isRewriting();
  }

  /**
   * Get rewrite options visibility from store
   */
  get showRewriteOptionsState(): boolean {
    return this.emailStore.showRewriteOptions();
  }

  /**
   * Get rewrite options from store
   */
  get currentRewriteOptions(): any {
    return {
      tone: this.emailStore.rewriteTone(),
      length: this.emailStore.rewriteLength()
    };
  }

  /**
   * Handle close
   */
  onClose(): void {
    this.dialogRef.close();
  }

  /**
   * Handle copy email
   */
  async onCopy(): Promise<void> {
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(this.emailText);
      console.log('✅ Email copied to clipboard');

      // Show temporary "copied" state
      this.copyButtonState.set('copied');
      setTimeout(() => {
        this.copyButtonState.set('copy');
      }, 2000); // Revert after 2 seconds
    } catch (err) {
      console.error('❌ Failed to copy email:', err);
    }
  }

  /**
   * Handle toggle rewrite options
   */
  onToggleRewriteOptions(): void {
    this.emailStore.toggleRewriteOptions();
  }

  /**
   * Handle rewrite email
   */
  onRewriteEmail(): void {
    this.emailStore.rewriteEmail();
  }

  /**
   * Handle update rewrite option
   */
  onUpdateRewriteOption(key: string, value: string): void {
    if (key === 'tone') {
      this.emailStore.setRewriteTone(value as 'formal' | 'neutral' | 'casual');
    } else if (key === 'length') {
      this.emailStore.setRewriteLength(value as 'short' | 'medium' | 'long');
    }
  }
}
