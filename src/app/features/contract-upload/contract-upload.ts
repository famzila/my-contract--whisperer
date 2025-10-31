import { ChangeDetectionStrategy, Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LoggerService } from '../../core/services/logger.service';
import { LucideAngularModule, Sparkles } from 'lucide-angular';
import { Button } from '../../shared/components/button/button';
import {
  FileText,
  SquarePen,
  Upload,
  TriangleAlert,
  ChartColumn,
  Clock,
  CircleCheckBig,
  BookOpen,
  CircleQuestionMark,
  Shield,
  Globe,
  Lightbulb,
  Search,
  Lock,
  Mail,
} from '../../shared/icons/lucide-icons';
import { ContractStore } from '../../core/stores/contract.store';
import { UiStore } from '../../core/stores/ui.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { LanguageStore } from '../../core/stores/language.store';
import {
  LANGUAGES,
  AI_CONFIG,
  APPLICATION_CONFIG,
} from '../../core/config/application.config';
import {
  isAppLanguageSupported,
  isGeminiNanoSupported,
  getLanguageTranslationKey
} from '../../core/utils/language.util';
import { Notice } from "../../shared/components/notice/notice";
import { computed } from '@angular/core';

type UploadMode = 'file' | 'text';

@Component({
  selector: 'app-contract-upload',
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, Button, Notice],
  templateUrl: './contract-upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractUpload {
  // Stores and services
  contractStore = inject(ContractStore);
  onboardingStore = inject(OnboardingStore);
  languageStore = inject(LanguageStore);
  translate = inject(TranslateService);
  uiStore = inject(UiStore);
  logger = inject(LoggerService);

  // Lucide icons
  readonly FileTextIcon = FileText;
  readonly EditIcon = SquarePen;
  readonly UploadIcon = Upload;
  readonly TriangleAlertIcon = TriangleAlert;
  readonly BarChart3Icon = ChartColumn;
  readonly ClockIcon = Clock;
  readonly CheckCircleIcon = CircleCheckBig;
  readonly BookOpenIcon = BookOpen;
  readonly HelpCircleIcon = CircleQuestionMark;
  readonly ShieldIcon = Shield;
  readonly GlobeIcon = Globe;
  readonly LightbulbIcon = Lightbulb;
  readonly SearchIcon = Search;
  readonly LockIcon = Lock;
  readonly MailIcon = Mail;
  SparklesIcon = Sparkles;

  // Local UI state
  mode = signal<UploadMode>('file');
  contractText = signal('');
  isDragging = signal(false);
  private partySelectorDialogRef: any = null;
  private chromeAiAvailable = signal<boolean | null>(null);
  
  
  constructor() {
    // Check Chrome AI availability on component init
    this.checkChromeAiAvailability();

    effect(() => {
      if (!this.shouldProcessOnboarding()) return;

      const onboardingState = this.getOnboardingState();

      // Handle onboarding flow with clear priority order
      if (this.shouldShowLanguageMismatchModal(onboardingState)) {
        this.showLanguageMismatchModal();
      } else if (this.shouldShowPartySelector(onboardingState)) {
        this.openPartySelector();
      }
    });
  }

  /**
   * Check if Chrome AI features are available
   */
  private async checkChromeAiAvailability(): Promise<void> {
    try {
      const status = await this.contractStore.checkAiAvailability();
      this.chromeAiAvailable.set(status.allAvailable);
    } catch (error) {
      this.logger.warn('Failed to check AI availability:', error);
      this.chromeAiAvailable.set(false);
    }
  }

  /**
   * Show Chrome AI notice if AI features are not available
   */
  showChromeAiNotice(): boolean {
    const available = this.chromeAiAvailable();
    return available === false; // Show notice only when we know AI is not available
  }

  /**
   * Check if we should process onboarding flow
   */
  private shouldProcessOnboarding(): boolean {
    return this.onboardingStore.isValidContract() === true;
  }

  /**
   * Get current onboarding state
   */
  private getOnboardingState() {
    return {
      needsLanguageSelection: this.onboardingStore.needsLanguageSelection(),
      needsPartySelection: this.onboardingStore.needsPartySelection(),
      selectedOutputLanguage: this.onboardingStore.selectedOutputLanguage(),
      detectedParties: this.onboardingStore.detectedParties(),
    };
  }

  /**
   * Check if language mismatch modal should be shown
   */
  private shouldShowLanguageMismatchModal(
    state: ReturnType<typeof this.getOnboardingState>
  ): boolean {
    return state.needsLanguageSelection;
  }

  /**
   * Check if party selector should be shown
   */
  private shouldShowPartySelector(state: ReturnType<typeof this.getOnboardingState>): boolean {
    if (this.partySelectorDialogRef) return false; // Already open

    // Priority 2: Party extraction loading state
    const isLoadingParties =
      !state.needsLanguageSelection &&
      state.selectedOutputLanguage !== null &&
      state.detectedParties === null;

    // Priority 3: Party selection (when parties are detected)
    return isLoadingParties || state.needsPartySelection;
  }

  /**
   * Switch between upload modes
   */
  setMode(mode: UploadMode): void {
    this.mode.set(mode);
    this.contractStore.clearErrors();
  }

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFile(input.files[0]);
    }
  }

  /**
   * Handle file drop
   */
  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFile(files[0]);
    }
  }

  /**
   * Handle drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  /**
   * Handle drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  /**
   * Process uploaded file
   * Delegates to ContractStore
   */
  private async processFile(file: File): Promise<void> {
    // Prevent analysis if offline and AI unavailable
    if (this.onboardingStore.isAnalysisDisabled()) {
      this.uiStore.showToast(
        this.translate.instant('upload.offlineUnavailable'),
        'error'
      );
      return;
    }

    try {
      // Reset onboarding state for new upload
      this.onboardingStore.reset();

      // Let the store handle parsing and analysis (stops at party selection)
      await this.contractStore.parseAndAnalyzeFile(file);

      // Navigation happens after user selects role in modal
    } catch (err) {
      const error = err as Error;
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Process text input
   * Delegates to ContractStore
   */
  async onTextSubmit(): Promise<void> {
    const text = this.contractText();

    if (!text.trim()) {
      this.uiStore.showToast('Please enter contract text', 'error');
      return;
    }

    // Prevent analysis if offline and AI unavailable
    if (this.onboardingStore.isAnalysisDisabled()) {
      this.uiStore.showToast(
        this.translate.instant('upload.offlineUnavailable'),
        'error'
      );
      return;
    }

    try {
      // Reset onboarding state for new upload
      this.onboardingStore.reset();

      // Let the store handle parsing and analysis (stops at party selection)
      await this.contractStore.parseAndAnalyzeText(text);

      // Navigation happens after user selects role in modal
    } catch (err) {
      const error = err as Error;
      this.uiStore.showToast('Analysis failed: ' + error.message, 'error');
    }
  }

  /**
   * Handle party role selection
   */
  async onSelectRole(role: string | null): Promise<void> {
    if (!role) return;

    const detectedParties = this.onboardingStore.detectedParties();
    const pendingText = this.onboardingStore.pendingContractText();
    
    if (!pendingText) {
      this.uiStore.showToast('No contract found', 'error');
      return;
    }

    // Show loading toast
    this.uiStore.showToast('Starting analysis...', 'info');

    // Use the consolidated store method with business logic
    const result = await this.contractStore.selectRoleAndAnalyze(
      role,
      detectedParties,
      pendingText
    );

    if (result.success) {
      this.logger.info(`✅ [ContractUpload] Role selection completed successfully`);
      // Note: Navigation to /analysis happens automatically in the store when metadata is ready (~1s)
    } else {
      this.logger.error(`❌ [ContractUpload] Role selection failed:`, result.error);
      // Surface error to the notice system so waitlist UI can render
      if (result.error) {
        this.contractStore.setAnalysisError(result.error);
      }
      this.uiStore.showToast(result.error || 'Analysis failed', 'error');
    }
  }


  /**
   * Handle language selection - use contract language (no translation)
   */
  async selectContractLanguage(): Promise<void> {
    const detectedLang = this.onboardingStore.detectedLanguage();

    this.logger.info(`🌍 User chose contract language: ${detectedLang}`);

    if (!detectedLang) return;

    // Pre-initialize translator if needed (requires user gesture!)
    if (!isGeminiNanoSupported(detectedLang)) {
      this.logger.info(
        `🌍 Pre-initializing translator for ${detectedLang} → en (user gesture available)`
      );
      try {
        await this.languageStore.createTranslator(detectedLang, LANGUAGES.ENGLISH);

        // Also pre-initialize reverse translator for post-translation
        await this.languageStore.createTranslator(LANGUAGES.ENGLISH, detectedLang);

        this.logger.info(`✅ Translators pre-initialized successfully`);
      } catch (error) {
        this.logger.error(`❌ Failed to pre-initialize translators:`, error);
        // Continue anyway - we'll try again during analysis
      }
    }

    // Set selected output language in onboarding store
    this.onboardingStore.setSelectedLanguage(detectedLang);

    // Check if we should switch app language
    if (isAppLanguageSupported(detectedLang)) {
      const currentAppLang = this.languageStore.preferredLanguage();
      if (detectedLang !== currentAppLang) {
        this.logger.info(`✅ Switching app to ${detectedLang} (supported)`);
        this.languageStore.setPreferredLanguage(detectedLang);

        // Optional: Show toast
        // this.uiStore.showToast(`App switched to ${this.getLanguageName(detectedLang)}`, 'info');
      }
    } else {
      this.logger.warn(
        `⚠️ ${detectedLang} not supported for app UI, keeping ${this.languageStore.preferredLanguage()}`
      );
      // App stays in current language, analysis will be in contract language
    }
  }

  /**
   * Handle language selection - use user's preferred language (with translation)
   */
  selectUserLanguage(): void {
    const preferredLang = this.languageStore.preferredLanguage();

    this.logger.info(`✅ Keeping app in ${preferredLang}, results will be translated`);

    // Set selected output language to current app language
    this.onboardingStore.setSelectedLanguage(preferredLang);

    // No app switch needed - already in preferred language
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string | null): string {
    if (!code) return this.translate.instant('languages.unknown');

    const translationKey = getLanguageTranslationKey(code);
    return this.translate.instant(translationKey);
  }

  /**
   * Get language flag emoji from code
   */
  getLanguageFlag(code: string | null): string {
    if (!code) return '🌍';
    const lang = this.languageStore.availableLanguages().find((l) => l.code === code);
    return lang?.flag || '🌍';
  }

  /**
   * Show language mismatch modal
   */
  showLanguageMismatchModal(): void {
    const detectedLang = this.onboardingStore.detectedLanguage();
    const preferredLang = this.languageStore.preferredLanguage();

    const languageData = {
      detectedLanguage: detectedLang,
      preferredLanguage: preferredLang,
      isContractLanguageSupported: isAppLanguageSupported(detectedLang!),

      // NEW: Language support information for Phase 0
      isContractLanguageAvailableInUI: isAppLanguageSupported(detectedLang!),
      canAnalyzeDirectly: isGeminiNanoSupported(detectedLang!),
      // In English-first mode, we don't show "limited support" notice since we intentionally translate even supported languages
      needsPreTranslation: AI_CONFIG.ANALYSIS_OUTPUT_MODE === 'english_first' 
        ? false  // Don't show notice in English-first mode
        : !isGeminiNanoSupported(detectedLang!),  // Original logic for other modes
      fallbackLanguage: isAppLanguageSupported(detectedLang!) ? detectedLang! : 'en',

      onSelectContractLanguage: () => this.selectContractLanguage(),
      onSelectUserLanguage: () => this.selectUserLanguage(),
      getLanguageName: (code: string) => this.getLanguageName(code),
      getLanguageFlag: (code: string) => this.getLanguageFlag(code),
    };

    this.uiStore.openLanguageMismatch(languageData);
  }

  /**
   * Reset upload state
   */
  reset(): void {
    this.contractText.set('');
    this.contractStore.clearErrors();
    this.onboardingStore.reset();
  }

  /**
   * Get word count for text area
   */
  get wordCount(): number {
    const text = this.contractText();
    if (!text) return 0;
    return text.split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Get estimated reading time (200 words per minute)
   */
  get readingTime(): number {
    const words = this.wordCount;
    return Math.ceil(words / 200);
  }

  /**
   * View sample contract
   */
  viewSampleContract(): void {
    this.uiStore.openSampleContract();
  }

  /**
   * Show how it works information
   */
  showHowItWorks(): void {
    this.uiStore.openHowItWorks();
  }

  /**
   * Show privacy policy
   */
  showPrivacyPolicy(): void {
    this.uiStore.openPrivacyPolicy();
  }

  /**
   * Show FAQ modal
   */
  showFaq(): void {
    this.uiStore.openFaq();
  }

  /**
   * Get base message from translated string with placeholders
   * For example: "Failed to parse PDF: {{error}}. Try copying..." -> "Failed to parse PDF:"
   */
  private getBaseTranslatedMessage(key: string, placeholder: string): string {
    const translated = this.translate.instant(key);
    const parts = translated.split(placeholder);
    return parts[0].trim();
  }

  /**
   * Get error message key if the error matches a known translation key
   * Returns the translation key if detected, null otherwise
   * Works across all languages by checking against actual translated strings
   */
  errorMessageKey = computed(() => {
    const error = this.contractStore.uploadError() || this.contractStore.analysisError();
    if (!error) return null;

    const lowerError = error.toLowerCase();

    // Check for Chrome API generic failure message
    if (lowerError.includes('other generic failures occurred') || 
        lowerError.includes('generic failures') ||
        lowerError === 'other generic failures occurred.') {
      return 'errors.genericFailure';
    }

    // Map of error keys to check (in order of likelihood)
    const errorKeys = [
      'errors.contractTextTooLong',
      'errors.fileSizeExceeded',
      'errors.contractTextTooShort',
      'errors.contractTextEmpty',
      'errors.unsupportedFileType',
      'errors.fileEmpty',
      'errors.pdfEmpty',
      'errors.pdfExtractionFailed',
      'errors.pdfParsingFailed',
      'errors.docxEmpty',
      'errors.docxExtractionFailed',
      'errors.docxParsingFailed',
    ];

    // Check each error key by comparing with current language translation
    for (const key of errorKeys) {
      const translation = this.translate.instant(key);
      const lowerTranslation = translation.toLowerCase();
      
      // If error exactly matches the translation, use the key
      if (translation === error || lowerError === lowerTranslation) {
        return key;
      }
      
      // For errors with dynamic parameters, check base pattern
      if (key === 'errors.pdfParsingFailed') {
        const baseMessage = this.getBaseTranslatedMessage(key, '{{error}}');
        const endingMessage = translation.includes('{{error}}') 
          ? translation.split('{{error}}')[1]?.trim() || '' 
          : '';
        
        // Check if error contains the base pattern and (if exists) the ending pattern
        if (baseMessage && lowerError.includes(baseMessage.toLowerCase())) {
          if (!endingMessage || lowerError.includes(endingMessage.toLowerCase())) {
            return key;
          }
        }
      }
      
      // For unsupportedFileType, check the base message (before {{type}})
      if (key === 'errors.unsupportedFileType') {
        const baseMessage = this.getBaseTranslatedMessage(key, '{{type}}');
        if (baseMessage && lowerError.includes(baseMessage.toLowerCase())) {
          return key;
        }
      }
      
      // For pdfEmpty, check if error contains the translated message or key parts
      if (key === 'errors.pdfEmpty') {
        if (lowerError.includes(lowerTranslation) || 
            lowerError.includes('pdf') && (lowerError.includes('empty') || lowerError.includes('فارغ'))) {
          return key;
        }
      }
    }

    return null;
  });

  /**
   * Get the error message to display (either the raw error or let translation handle it)
   */
  errorMessage = computed(() => {
    const error = this.contractStore.uploadError() || this.contractStore.analysisError();
    const key = this.errorMessageKey();
    
    // If we detected a key, return null so messageKey will be used instead
    if (key) {
      return null;
    }
    
    // Otherwise return the raw error message
    return error;
  });

  /**
   * Check if the current error should show waitlist button
   * Shows button for fileSizeExceeded, contractTextTooLong, unsupported file types (images), 
   * PDF with images only, or any "too large" input errors
   * Works across all languages by checking error keys and translated patterns
   */
  shouldShowWaitlist = computed(() => {
    const error = this.contractStore.uploadError() || this.contractStore.analysisError();
    if (!error) return false;

    const key = this.errorMessageKey();
    const lowerError = error.toLowerCase();
    
    // Check if it's a waitlist-related error key (always show for these)
    if (key === 'errors.fileSizeExceeded' || key === 'errors.contractTextTooLong') {
      return true;
    }

    // Check for PDF errors related to images using translated patterns
    if (key === 'errors.pdfParsingFailed' || key === 'errors.pdfEmpty' || key === 'errors.pdfExtractionFailed') {
      // Get translated pdfEmpty message and check if it contains image-related phrases
      const pdfEmptyTranslation = this.translate.instant('errors.pdfEmpty').toLowerCase();
      
      // Check if error or translated message mentions images (multi-language support)
      const imagePatterns = [
        // English patterns
        'contains only images',
        'only images',
        'no text',
        'image',
        // Arabic patterns (from translation)
        'صور', // images
        'صورة', // image
        'يحتوي على صور فقط', // contains only images (from Arabic translation)
        'فارغ أو يحتوي على صور', // empty or contains images
      ];
      
      // Check both error message and the translated pdfEmpty message
      const checkText = lowerError + ' ' + pdfEmptyTranslation;
      return imagePatterns.some(pattern => checkText.includes(pattern.toLowerCase()));
    }

    // Check for unsupported file type errors (especially images)
    if (key === 'errors.unsupportedFileType') {
      // Check if the error message contains image MIME types (language-independent)
      const imageMimeTypes = [
        'image/',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/bmp',
        'image/svg',
      ];
      
      return imageMimeTypes.some(type => lowerError.includes(type));
    }

    // Fallback: Check raw error message for image-related patterns across languages
    const imageErrorPatterns = [
      // English
      'contains only images',
      'only images',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/',
      // Arabic
      'صور', // images
      'صورة', // image
      'يحتوي على صور', // contains images
    ];
    
    if (imageErrorPatterns.some(pattern => lowerError.includes(pattern))) {
      return true;
    }

    // Check for "too large" patterns (from Chrome AI API or browser validation)
    // Get translated messages to check against
    const fileSizeError = this.translate.instant('errors.fileSizeExceeded').toLowerCase();
    const textLengthError = this.translate.instant('errors.contractTextTooLong').toLowerCase();
    const checkText = lowerError + ' ' + fileSizeError + ' ' + textLengthError;
    
    const tooLargePatterns = [
      // English patterns
      'too large',
      'input is too large',
      'exceeds',
      'exceeded',
      'maximum',
      'limit',
      '50,000',
      '50000',
      '5mb',
      '5 mb',
      // Numeric/universal patterns
      '50000',
      '5 ميجابايت', // 5MB in Arabic
    ];

    return tooLargePatterns.some(pattern => checkText.includes(pattern.toLowerCase()));
  });

  /**
   * Open waitlist form in new tab
   */
  openWaitlist(): void {
    window.open(APPLICATION_CONFIG.UI.WAITLIST_FORM_URL, '_blank', 'noopener,noreferrer');
  }

  /**
   * Open party selector modal
   */
  openPartySelector(): void {
    if (this.partySelectorDialogRef) {
      return; // Already open
    }

    // Check if we're in loading state (extracting parties)
    const isLoading =
      this.onboardingStore.isValidContract() === true &&
      !this.onboardingStore.needsLanguageSelection() &&
      this.onboardingStore.selectedOutputLanguage() !== null &&
      this.onboardingStore.detectedParties() === null;

    this.partySelectorDialogRef = this.uiStore.openPartySelector({
      data: {
        detectedParties: this.onboardingStore.detectedParties(),
        isLoading: isLoading,
      },
    });

    // Subscribe to role selection
    this.partySelectorDialogRef.componentInstance.selectRole.subscribe((role: string) => {
      this.onSelectRole(role);
      this.partySelectorDialogRef?.close();
      this.partySelectorDialogRef = null;
    });

    // Subscribe to close event
    this.partySelectorDialogRef.closed.subscribe(() => {
      this.partySelectorDialogRef = null;
    });
  }
}
