import { ChangeDetectionStrategy, Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Sparkles } from 'lucide-angular';
import { Button } from '../../shared/components/button/button';
import {
  FileText,
  Edit,
  Upload,
  AlertTriangle,
  BarChart3,
  Clock,
  CheckCircle,
  BookOpen,
  HelpCircle,
  Shield,
  Globe,
  Lightbulb,
  Search,
  Lock,
} from '../../shared/icons/lucide-icons';
import { ContractStore } from '../../core/stores/contract.store';
import { UiStore } from '../../core/stores/ui.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { LanguageStore } from '../../core/stores/language.store';
import { ContractParserService } from '../../core/services/contract-parser.service';
import { TranslatorService } from '../../core/services/ai/translator.service';
import { AiOrchestratorService } from '../../core/services/ai/ai-orchestrator.service';
import {
  isAppLanguageSupported,
  isGeminiNanoSupported,
  getLanguageTranslationKey,
  LANGUAGES,
} from '../../core/constants/languages';
import { Notice } from "../../shared/components/notice/notice";

type UploadMode = 'file' | 'text';

@Component({
  selector: 'app-contract-upload',
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule, Button, Notice],
  templateUrl: './contract-upload.html',
  styles: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractUpload {
  // Stores and services
  contractStore = inject(ContractStore);
  onboardingStore = inject(OnboardingStore);
  languageStore = inject(LanguageStore);
  translate = inject(TranslateService);
  uiStore = inject(UiStore);
  private aiOrchestrator = inject(AiOrchestratorService);

  // Lucide icons
  readonly FileTextIcon = FileText;
  readonly EditIcon = Edit;
  readonly UploadIcon = Upload;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly BarChart3Icon = BarChart3;
  readonly ClockIcon = Clock;
  readonly CheckCircleIcon = CheckCircle;
  readonly BookOpenIcon = BookOpen;
  readonly HelpCircleIcon = HelpCircle;
  readonly ShieldIcon = Shield;
  readonly GlobeIcon = Globe;
  readonly LightbulbIcon = Lightbulb;
  readonly SearchIcon = Search;
  readonly LockIcon = Lock;
  SparklesIcon = Sparkles;
  private parserService = inject(ContractParserService);
  private translatorService = inject(TranslatorService);

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
      const status = await this.aiOrchestrator.checkAvailability();
      this.chromeAiAvailable.set(status.allAvailable);
    } catch (error) {
      console.warn('Failed to check AI availability:', error);
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

    // Map party1/party2 to actual roles
    let actualRole: string = role;
    const detectedParties = this.onboardingStore.detectedParties();

    if (role === 'party1' && detectedParties?.parties?.party1) {
      // Map party1 to its actual role (e.g., 'landlord', 'employer')
      actualRole = this.mapPartyRoleToUserRole(detectedParties.parties.party1.role);
      console.log(
        `👤 [Selection] User selected Party 1 (${detectedParties.parties.party1.name}) → Role: ${actualRole}`
      );
    } else if (role === 'party2' && detectedParties?.parties?.party2) {
      // Map party2 to its actual role (e.g., 'tenant', 'employee')
      actualRole = this.mapPartyRoleToUserRole(detectedParties.parties.party2.role);
      console.log(
        `👤 [Selection] User selected Party 2 (${detectedParties.parties.party2.name}) → Role: ${actualRole}`
      );
    } else {
      console.log(`👤 [Selection] User selected generic role: ${actualRole}`);
    }

    // Set role in onboarding store
    this.onboardingStore.setSelectedRole(actualRole as any);

    // Get pending contract text
    const pendingText = this.onboardingStore.pendingContractText();
    if (!pendingText) {
      this.uiStore.showToast('No contract found', 'error');
      return;
    }

    // Now trigger analysis with the selected role
    this.uiStore.showToast('Starting analysis...', 'info');

    try {
      // Re-parse and analyze with selected role (progressive loading)
      const parsedContract = this.parserService.parseText(pendingText, 'pending-analysis');

      // Start analysis - navigation happens automatically when metadata is ready!
      // Don't await - let it run in background while we navigate
      this.contractStore.analyzeContract(parsedContract).catch((error) => {
        console.error('❌ Analysis error:', error);
        // Don't navigate back to upload - user is already on analysis page
        // Just show toast - they can see what sections loaded successfully
        this.uiStore.showToast('Some sections failed to load. Please try refreshing.', 'warning');
      });

      // Note: Navigation to /analysis happens automatically in the store when metadata is ready (~1s)
    } catch (error) {
      this.uiStore.showToast('Analysis failed', 'error');
    }
  }

  /**
   * Map detected party role to UserRole enum
   * Party roles from AI: "Landlord", "Tenant", "Employer", "Employee", etc.
   * UserRole: 'landlord', 'tenant', 'employer', 'employee', etc. (lowercase)
   */
  private mapPartyRoleToUserRole(partyRole: string): string {
    const roleMap: Record<string, string> = {
      Landlord: 'landlord',
      Tenant: 'tenant',
      Employer: 'employer',
      Employee: 'employee',
      Client: 'client',
      Contractor: 'contractor',
      Partner: 'partner',
      Lessor: 'landlord',
      Lessee: 'tenant',
    };

    return roleMap[partyRole] || partyRole.toLowerCase();
  }

  /**
   * Handle language selection - use contract language (no translation)
   */
  async selectContractLanguage(): Promise<void> {
    const detectedLang = this.onboardingStore.detectedLanguage();

    console.log(`🌍 User chose contract language: ${detectedLang}`);

    if (!detectedLang) return;

    // Pre-initialize translator if needed (requires user gesture!)
    if (!isGeminiNanoSupported(detectedLang)) {
      console.log(
        `🌍 Pre-initializing translator for ${detectedLang} → en (user gesture available)`
      );
      try {
        await this.translatorService.createTranslator({
          sourceLanguage: detectedLang,
          targetLanguage: LANGUAGES.ENGLISH,
        });

        // Also pre-initialize reverse translator for post-translation
        await this.translatorService.createTranslator({
          sourceLanguage: LANGUAGES.ENGLISH,
          targetLanguage: detectedLang,
        });

        console.log(`✅ Translators pre-initialized successfully`);
      } catch (error) {
        console.error(`❌ Failed to pre-initialize translators:`, error);
        // Continue anyway - we'll try again during analysis
      }
    }

    // Set selected output language in onboarding store
    this.onboardingStore.setSelectedLanguage(detectedLang);

    // Check if we should switch app language
    if (isAppLanguageSupported(detectedLang)) {
      const currentAppLang = this.languageStore.preferredLanguage();
      if (detectedLang !== currentAppLang) {
        console.log(`✅ Switching app to ${detectedLang} (supported)`);
        this.languageStore.setPreferredLanguage(detectedLang);

        // Optional: Show toast
        // this.uiStore.showToast(`App switched to ${this.getLanguageName(detectedLang)}`, 'info');
      }
    } else {
      console.warn(
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

    console.log(`✅ Keeping app in ${preferredLang}, results will be translated`);

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
      needsPreTranslation: !isGeminiNanoSupported(detectedLang!),
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
