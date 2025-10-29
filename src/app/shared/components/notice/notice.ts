  import {
    ChangeDetectionStrategy,
    Component,
    input,
    computed,
    inject,
  } from '@angular/core';
  import { LucideAngularModule, LucideIconData } from 'lucide-angular';
  import { TranslatePipe } from '@ngx-translate/core';
  import { LanguageStore } from '../../../core/stores/language.store';
  import { LoadingSpinner } from '../loading-spinner/loading-spinner';
  
  export type NoticeType = 'default' | 'info' | 'success' | 'warning' | 'primary' | 'error' | 'loading';
  
  /**
   * Notice Component - Reusable informational notice component
   *
   * UX Guidelines for Notice Types:
   *
   * - 'default': Neutral gray notices for general tips, pro tips, or supplementary information
   *   Use for: Pro tips, general guidance, non-critical information, tips that don't require attention
   *   Example: "Pro tip: Choose 'Compare both perspectives' to see risks from both parties' viewpoints"
   *
   * - 'info': Blue notices for informational content that users should be aware of
   *   Use for: General information, helpful context, explanations, non-urgent guidance
   *   Example: "This analysis helps you understand contract terms and potential risks"
   *
   * - 'success': Green notices for positive feedback and successful actions
   *   Use for: Confirmation messages, successful operations, positive outcomes
   *   Example: "Contract analysis completed successfully"
   *
   * - 'warning': Amber notices for important information that requires attention
   *   Use for: Important warnings, limitations, things users should be aware of
   *   Example: "Limited support for this language - will translate for analysis"
   *
   * - 'primary': Indigo notices for primary actions, features, or important highlights
   *   Use for: Feature highlights, primary actions, important call-to-actions
   *   Example: "Customize your email style with tone and length options"
   *
   * - 'error': Red notices for critical errors and failures
   *   Use for: Critical errors, failed operations, critical information
   *   Example: "Failed to upload contract - please try again"
   * */
  
  @Component({
    selector: 'app-notice',
    imports: [LucideAngularModule, TranslatePipe, LoadingSpinner],
    templateUrl: './notice.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export class Notice {
    private readonly languageStore = inject(LanguageStore);
  
    // Inputs
    type = input<NoticeType>('default');
    icon = input<LucideIconData | undefined>(undefined);
    title = input<string>('');
    titleKey = input<string>('');
    message = input<string | null>(null);
    messageKey = input<string | null>(null);
    showIcon = input<boolean>(true);
    isLoading = input<boolean>(false);
  
    // Computed properties
    hasTitle = computed(() => !!(this.title() || this.titleKey()));
    hasMessage = computed(() => !!(this.message() || this.messageKey()));
    hasIcon = computed(() => this.showIcon() && !!this.icon());
    hasHeader = computed(() => this.hasTitle() || this.hasIcon());
    
    // Expose RTL as computed signal for zoneless reactivity
    isRTL = computed(() => this.languageStore.isRTL());
  
    /**
     * Get header classes with RTL support
     */
    headerClasses = computed(() => {
      const baseClasses = 'flex items-center gap-2';
      const rtlClasses = this.isRTL() ? 'flex-start' : 'flex-row';
      return `${baseClasses} ${rtlClasses}`;
    });
  
    /**
     * Get container CSS classes
     */
    containerClasses = computed(() => {
      const classes = ['p-4', 'rounded-lg', 'my-4'];
      const type = this.type();
  
      // Background color
      switch (type) {
        case 'default':
          classes.push('bg-gray-50', 'dark:bg-gray-800/50');
          break;
        case 'info':
          classes.push('bg-blue-50', 'dark:bg-blue-900/20');
          break;
        case 'success':
          classes.push('bg-green-50', 'dark:bg-green-900/20');
          break;
        case 'warning':
          classes.push('bg-amber-50', 'dark:bg-amber-900/20');
          break;
        case 'primary':
          classes.push('bg-indigo-50', 'dark:bg-indigo-900/20');
          break;
        case 'error':
          classes.push('bg-red-50', 'dark:bg-red-900/20');
          break;
        case 'loading':
          classes.push('bg-amber-50', 'dark:bg-amber-900/20');
          break;
      }
  
      // Border style
      classes.push('border');
      switch (type) {
        case 'default':
          classes.push('border-gray-200', 'dark:border-gray-700');
          break;
        case 'info':
          classes.push('border-blue-200', 'dark:border-blue-800');
          break;
        case 'success':
          classes.push('border-green-200', 'dark:border-green-800');
          break;
        case 'warning':
          classes.push('border-amber-200', 'dark:border-amber-800');
          break;
        case 'primary':
          classes.push('border-indigo-200', 'dark:border-indigo-800');
          break;
        case 'error':
          classes.push('border-red-200', 'dark:border-red-800');
          break;
        case 'loading':
          classes.push('border-amber-200', 'dark:border-amber-800');
          break;
      }
  
      return classes.join(' ');
    });
  
    /**
     * Get icon CSS classes
     */
    iconClasses = computed(() => {
      const classes = ['w-5', 'h-5', 'flex-shrink-0'];
  
      switch (this.type()) {
        case 'default':
          classes.push('text-amber-600', 'dark:text-amber-400');
          break;
        case 'info':
          classes.push('text-blue-600', 'dark:text-blue-400');
          break;
        case 'success':
          classes.push('text-green-600', 'dark:text-green-400');
          break;
        case 'warning':
          classes.push('text-amber-600', 'dark:text-amber-400');
          break;
        case 'primary':
          classes.push('text-indigo-600', 'dark:text-indigo-400');
          break;
        case 'error':
          classes.push('text-red-600', 'dark:text-red-400');
          break;
        case 'loading':
          classes.push('text-amber-600', 'dark:text-amber-400');
          break;
      }
  
      return classes.join(' ');
    });
  
    /**
     * Get title CSS classes
     */
    titleClasses = computed(() => {
      const classes = ['font-semibold', 'text-left', 'rtl:text-right'];
  
      switch (this.type()) {
        case 'default':
          classes.push('text-gray-800', 'dark:text-gray-200');
          break;
        case 'info':
          classes.push('text-blue-800', 'dark:text-blue-200');
          break;
        case 'success':
          classes.push('text-green-800', 'dark:text-green-200');
          break;
        case 'warning':
          classes.push('text-amber-900', 'dark:text-amber-200');
          break;
        case 'primary':
          classes.push('text-indigo-800', 'dark:text-indigo-200');
          break;
        case 'error':
          classes.push('text-red-800', 'dark:text-red-200');
          break;
        case 'loading':
          classes.push('text-amber-900', 'dark:text-amber-200');
          break;
      }
  
      return classes.join(' ');
    });
  
    /**
     * Get message CSS classes
     */
    messageClasses = computed(() => {
      const classes = ['text-sm', 'text-left', 'rtl:text-right'];
  
      switch (this.type()) {
        case 'default':
          classes.push('text-gray-700', 'dark:text-gray-300');
          break;
        case 'info':
          classes.push('text-blue-700', 'dark:text-blue-300');
          break;
        case 'success':
          classes.push('text-green-700', 'dark:text-green-300');
          break;
        case 'warning':
          classes.push('text-amber-700', 'dark:text-amber-300');
          break;
        case 'primary':
          classes.push('text-indigo-700', 'dark:text-indigo-300');
          break;
        case 'error':
          classes.push('text-red-700', 'dark:text-red-300');
          break;
        case 'loading':
          classes.push('text-amber-700', 'dark:text-amber-300');
          break;
      }
  
      return classes.join(' ');
    });
  }