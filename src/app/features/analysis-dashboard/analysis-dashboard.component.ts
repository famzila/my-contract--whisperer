import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ContractStore, EmailDraftStore, UiStore } from '../../core/stores';
import { LanguageStore } from '../../core/stores/language.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { PerspectiveContext } from '../../core/models/ai-analysis.model';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { TabsComponent, TabConfig } from '../../shared/components/tabs/tabs.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { SummaryTabComponent } from './components/summary-tab/summary-tab.component';
import { RisksTabComponent } from './components/risks-tab/risks-tab.component';
import { ObligationsTabComponent } from './components/obligations-tab/obligations-tab.component';
import { OmissionsTabComponent } from './components/omissions-tab/omissions-tab.component';
import { QuestionsTabComponent } from './components/questions-tab/questions-tab.component';
import { DisclaimerTabComponent } from './components/disclaimer-tab/disclaimer-tab.component';

import { AppConfig } from '../../core/config/app.config';
import { isAppLanguageSupported, getLanguageTranslationKey } from '../../core/constants/languages';
import { mapObligationsToPerspective, PerspectiveObligations } from '../../core/utils/obligation-mapper.util';
import {
  Clipboard,
  AlertTriangle,
  Clock,
  FileX,
  Info,
  Scale,
  Globe,
  Languages,
} from '../../shared/icons/lucide-icons';
import { Notice } from "../../shared/components/notice/notice";

@Component({
  selector: 'app-analysis-dashboard',
  imports: [
    TranslateModule,
    LucideAngularModule,
    LoadingSpinner,
    Notice,
    TabsComponent,
    DashboardHeaderComponent,
    SummaryTabComponent,
    RisksTabComponent,
    ObligationsTabComponent,
    OmissionsTabComponent,
    QuestionsTabComponent,
    DisclaimerTabComponent,
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analysis-dashboard.component.html',
})
export class AnalysisDashboard implements OnInit {
  // Injected services using modern inject() function
  private contractStore = inject(ContractStore);
  private emailStore = inject(EmailDraftStore);
  private uiStore = inject(UiStore);
  private languageStore = inject(LanguageStore);
  private onboardingStore = inject(OnboardingStore);
  private router = inject(Router);
  private translate = inject(TranslateService);

  // Modern signals for component state
  selectedTab = signal<string>('summary');
  copyAllButtonState = signal<'copy' | 'copied'>('copy');
  showingOriginal = signal(false); // Toggle between translated and original

  // Icons
  ClipboardIcon = Clipboard;
  AlertTriangleIcon = AlertTriangle;
  ClockIcon = Clock;
  FileXIcon = FileX;
  InfoIcon = Info;
  ScaleIcon = Scale;
  LanguagesIcon = Languages;

  // Computed signals for reactive data
  canShowDashboard = computed(() => !!this.contractStore.canShowDashboard());
  isAnalyzing = computed(() => this.contractStore.isAnalyzing());
  isMockMode = computed(() => false); // Simplified for demo
  
  // Progressive loading states (from store)
  isMetadataLoading = computed(() => this.contractStore.sectionsMetadata()?.loading || false);
  isSummaryLoading = computed(() => this.contractStore.sectionsSummary()?.loading || false);
  isRisksLoading = computed(() => this.contractStore.sectionsRisks()?.loading || false);
  isObligationsLoading = computed(() => this.contractStore.sectionsObligations()?.loading || false);
  isOmissionsLoading = computed(() => this.contractStore.sectionsOmissionsQuestions()?.loading || false);
  
  // Retry state
  summaryRetryCount = computed(() => this.contractStore.sectionsSummary()?.retryCount || 0);
  risksRetryCount = computed(() => this.contractStore.sectionsRisks()?.retryCount || 0);
  obligationsRetryCount = computed(() => this.contractStore.sectionsObligations()?.retryCount || 0);
  omissionsRetryCount = computed(() => this.contractStore.sectionsOmissionsQuestions()?.retryCount || 0);
  
  summaryIsRetrying = computed(() => this.contractStore.sectionsSummary()?.isRetrying || false);
  risksIsRetrying = computed(() => this.contractStore.sectionsRisks()?.isRetrying || false);
  obligationsIsRetrying = computed(() => this.contractStore.sectionsObligations()?.isRetrying || false);
  omissionsIsRetrying = computed(() => this.contractStore.sectionsOmissionsQuestions()?.isRetrying || false);
  
  // Translation state
  isTranslating = computed(() => this.contractStore.isTranslating());
  translatingToLanguage = computed(() => this.contractStore.translatingToLanguage());
  
  targetLanguageName = computed(() => {
    const lang = this.translatingToLanguage();
    if (!lang) return '';
    
    // Map language codes to names
    const languageNames: Record<string, string> = {
      'en': 'English',
      'ar': 'العربية',
      'fr': 'Français',
      'es': 'Español',
      'de': 'Deutsch',
      'ja': '日本語',
      'zh': '中文',
      'ko': '한국어'
    };
    
    return languageNames[lang] || lang;
  });

  // Translation error state
  translationError = computed(() => this.contractStore.analysisError());
  
  // Email drafting state
  isDrafting = computed(() => this.emailStore.isDrafting());

  // Tab configuration using modern signals - reactive to language changes
  tabConfigs = computed<TabConfig[]>(() => [
    {
      id: 'summary',
      labelKey: 'analysis.tabs.summary',
      icon: this.ClipboardIcon,
      isLoading: this.isSummaryLoading(),
    },
    {
      id: 'risks',
      labelKey: 'analysis.tabs.risks',
      icon: this.AlertTriangleIcon,
      isLoading: this.isRisksLoading(),
      badge: this.risks()?.length || 0,
    },
    {
      id: 'obligations',
      labelKey: 'analysis.tabs.obligations',
      icon: this.ClockIcon,
      isLoading: this.isObligationsLoading(),
    },
    {
      id: 'omissions',
      labelKey: 'analysis.tabs.omissions',
      icon: this.FileXIcon,
      isLoading: this.isOmissionsLoading(),
      badge: this.omissions()?.length || 0,
    },
    {
      id: 'questions',
      labelKey: 'analysis.tabs.questions',
      icon: this.InfoIcon,
      isLoading: this.isOmissionsLoading(),
      badge: this.questions()?.length || 0,
    },
    {
      id: 'disclaimer',
      labelKey: 'analysis.tabs.disclaimer',
      icon: this.ScaleIcon,
    },
  ]);


  ngOnInit(): void {
    // Redirect to upload if no analysis data is available
    if (!this.canShowDashboard()) {
      this.router.navigate(['/upload']);
      return;
    }
  }

  // Tab selection handler
  selectTab(tabId: string): void {
    this.selectedTab.set(tabId);
  }

  // Data getters - use progressive loading data if available, fallback to analysis
  metadata = computed(() => {
    // Get progressive loading metadata
    const progressiveMetadata = this.contractStore.sectionsMetadata()?.data;
    if (progressiveMetadata) {
      return progressiveMetadata;
    }
    
    return null;
  });

  summary = computed(() => {
    // Get progressive loading summary
    const progressiveSummary = this.contractStore.sectionsSummary()?.data;
    if (progressiveSummary !== undefined) {
      // Return the full summary object (includes quickTake + summary)
      return progressiveSummary; // Can be null if extraction failed
    }
    
    return null;
  });

  risks = computed(() => {
    // Get progressive loading risks
    const progressiveRisks = this.contractStore.sectionsRisks()?.data;
    if (progressiveRisks) {
      return progressiveRisks.risks || [];
    }
    
    return [];
  });

  obligations = computed((): PerspectiveObligations | null => {
    // Get progressive loading obligations
    const progressiveObligations = this.contractStore.sectionsObligations()?.data;
    
    if (progressiveObligations !== undefined) {
      // Handle nested obligations structure from AI response
      if (progressiveObligations && typeof progressiveObligations === 'object' && 'obligations' in progressiveObligations) {
        const metadata = this.contractStore.sectionsMetadata()?.data;
        const selectedRole = this.onboardingStore.selectedRole();

        if (metadata) {
          const result = mapObligationsToPerspective(
            progressiveObligations.obligations,
            metadata,
            selectedRole
          );
          return result;
        }
      }
      return null; // Can be null if extraction failed
    }
    
    return null;
  });

  omissions = computed(() => {
    // Get progressive loading omissions
    const progressiveOmissions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveOmissions) {
      return progressiveOmissions.omissions || [];
    }
    
    return [];
  });

  questions = computed(() => {
    // Get progressive loading questions
    const progressiveQuestions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveQuestions) {
      return progressiveQuestions.questions || [];
    }
    
    return [];
  });

  getDisclaimer() {
    return this.translate.instant('analysis.disclaimer.text');
  }

  // Risk filtering methods
  getHighRisks() {
    return this.risks().filter((risk: any) => risk.severity === 'high');
  }

  getMediumRisks() {
    return this.risks().filter((risk: any) => risk.severity === 'medium');
  }

  getLowRisks() {
    return this.risks().filter((risk: any) => risk.severity === 'low');
  }

  // Omission filtering methods
  getHighPriorityOmissions() {
    return this.omissions().filter((omission: any) => omission.priority === 'high');
  }

  getMediumPriorityOmissions() {
    return this.omissions().filter((omission: any) => omission.priority === 'medium');
  }

  getLowPriorityOmissions() {
    return this.omissions().filter((omission: any) => omission.priority === 'low');
  }

  // Perspective and context methods
  getPerspectiveBadge() {
    const metadata = this.metadata();
    const role = metadata?.analyzedForRole;

    if (!role || role === 'both_views') {
      return role === 'both_views'
        ? {
            icon: this.ScaleIcon,
            text: this.translate.instant('analysis.badge.bothParties'),
            className:
              'px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full border border-green-200',
          }
        : {
            icon: this.InfoIcon,
            text: this.translate.instant('analysis.badge.yourPerspective'),
            className:
              'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200',
          };
    }

    // Handle party1/party2 roles - use actual party names
    if (role === 'party1' && metadata?.parties?.party1) {
      const party = metadata.parties.party1;
      const translatedRole = this.translate.instant(`roles.${party.role?.toLowerCase() || 'unknown'}`);
      return {
        icon: this.ClipboardIcon,
        text: this.translate.instant('analysis.badge.fromPerspective', { name: translatedRole }),
        className:
          'px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200',
      };
    }

    if (role === 'party2' && metadata?.parties?.party2) {
      const party = metadata.parties.party2;
      const translatedRole = this.translate.instant(`roles.${party.role?.toLowerCase() || 'unknown'}`);
      return {
        icon: this.InfoIcon,
        text: this.translate.instant('analysis.badge.fromPerspective', { name: translatedRole }),
        className:
          'px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200',
      };
    }

    // Fallback: Try to find matching party by role name
    if (metadata?.parties) {
      const { party1, party2 } = metadata.parties;
      
      // Check if role matches party1's role (case-insensitive)
      if (party1?.role && party1.role.toLowerCase() === role.toLowerCase()) {
        const translatedRole = this.translate.instant(`roles.${party1.role.toLowerCase()}`);
        return {
          icon: this.ClipboardIcon,
          text: this.translate.instant('analysis.badge.fromPerspective', { name: translatedRole }),
          className:
            'px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200',
        };
      }
      
      // Check if role matches party2's role (case-insensitive)
      if (party2?.role && party2.role.toLowerCase() === role.toLowerCase()) {
        const translatedRole = this.translate.instant(`roles.${party2.role.toLowerCase()}`);
        return {
          icon: this.InfoIcon,
          text: this.translate.instant('analysis.badge.fromPerspective', { name: translatedRole }),
          className:
            'px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200',
        };
      }
    }

    // Final fallback: show the role name
    const translatedRole = this.translate.instant(`roles.${role.toLowerCase()}`);
    return {
      icon: this.InfoIcon,
      text: this.translate.instant('analysis.badge.fromPerspective', { name: translatedRole }),
      className:
        'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200',
    };
  }

  getPerspectiveContext(): PerspectiveContext | null {
    const metadata = this.metadata();
    const role = metadata?.analyzedForRole;

    if (!role || role === 'both_views') {
      return null;
    }

    const contextMap: Record<string, { icon: any; titleKey: string; messageKey: string }> = {
      employer: {
        icon: this.ClipboardIcon,
        titleKey: 'analysis.perspectiveContext.employer.title',
        messageKey: 'analysis.perspectiveContext.employer.message',
      },
      employee: {
        icon: this.InfoIcon,
        titleKey: 'analysis.perspectiveContext.employee.title',
        messageKey: 'analysis.perspectiveContext.employee.message',
      },
    };

    return contextMap[role] || null;
  }

  // Language and translation methods
  wasTranslated(): boolean {
    // Translation info is not stored separately in progressive loading
    // Check if detected language differs from app language
    const detectedLang = this.languageStore.detectedContractLanguage();
    const appLang = this.languageStore.preferredLanguage();
    return detectedLang !== null && detectedLang !== appLang;
  }

  getSourceLanguageName(): string {
    const code = this.languageStore.detectedContractLanguage();
    if (!code) return this.translate.instant('languages.unknown');

    const translationKey = getLanguageTranslationKey(code);
    return this.translate.instant(translationKey);
  }

  showLanguageMismatchBanner = computed(() => {
    const appLang = this.languageStore.preferredLanguage();
    const detectedLang = this.languageStore.detectedContractLanguage();
    return appLang !== detectedLang && detectedLang !== null;
  });

  analysisLanguageName = computed(() => {
    const lang = this.languageStore.detectedContractLanguage();
    return this.getLanguageNameByCode(lang || 'en');
  });

  appLanguageName = computed(() => {
    const lang = this.languageStore.preferredLanguage();
    return this.getLanguageNameByCode(lang);
  });

  canSwitchAppLanguage = computed(() => {
    const detectedLang = this.languageStore.detectedContractLanguage();
    return detectedLang ? isAppLanguageSupported(detectedLang) : false;
  });

  private getLanguageNameByCode(code: string): string {
    const translationKey = getLanguageTranslationKey(code);
    return this.translate.instant(translationKey);
  }

  switchAppToAnalysisLanguage(): void {
    const detectedLang = this.languageStore.detectedContractLanguage();
    if (detectedLang && isAppLanguageSupported(detectedLang)) {
      this.languageStore.setPreferredLanguage(detectedLang);
    }
  }

  // Action methods
  uploadNew() {
    this.router.navigate(['/upload']);
  }

  toggleOriginal(): void {
    this.showingOriginal.update(v => !v);
  }

  // Question and email methods
  copyQuestion(question: string) {
    navigator.clipboard.writeText(question);
  }

  copyAllQuestions() {
    const questions = this.questions();
    const questionsText = questions
      .map((q: string, index: number) => `${index + 1}. ${q}`)
      .join('\n\n');
    navigator.clipboard.writeText(questionsText);
    this.copyAllButtonState.set('copied');
    setTimeout(() => this.copyAllButtonState.set('copy'), 2000);
  }

  /**
   * Draft a professional email with questions using Writer API
   * Delegates to EmailDraftStore with smart context detection
   */
  async draftProfessionalEmail(): Promise<void> {
    const metadata = this.metadata();
    const questions = this.questions();
    
    if (!metadata || !questions.length) return;
    
    const selectedRole = metadata.analyzedForRole;
    
    // Delegate to EmailDraftStore with smart context detection
    await this.emailStore.draftProfessionalEmailWithContext(questions, metadata, selectedRole);
    
    // Open the email draft modal
    this.openEmailDraftModal();
  }

  /**
   * Open email draft modal using ModalService
   */
  openEmailDraftModal(): void {
    const emailData = {
      emailContent: this.emailStore.draftedEmail(),
      isRewriting: this.emailStore.isRewriting(),
      showRewriteOptions: this.emailStore.showRewriteOptions(),
      rewriteOptions: {
        tone: this.emailStore.rewriteTone(),
        length: this.emailStore.rewriteLength()
      }
    };

    this.uiStore.openEmailDraft(emailData);
  }

  /**
   * Check if the current user perspective is the contract provider
   * Contract providers typically don't need to ask questions about their own contract
   * 
   * @returns true if user is likely the contract provider (hide email draft feature)
   */
  isContractProvider(): boolean {
    const metadata = this.metadata();
    const role = metadata?.analyzedForRole?.toLowerCase();
    
    if (!role) return false;
    
    // These roles typically PROVIDE the contract (they wrote it, so they don't need to ask questions)
    const providerRoles = ['employer', 'landlord', 'client'];
    
    // Special cases:
    // - 'partner': Could be either, so ALLOW email drafting
    // - 'both_views': Not a real perspective, so HIDE email drafting
    if (role === 'both_views') return true; // Hide for both views
    if (role === 'partner') return false; // Allow for partners
    
    return providerRoles.includes(role);
  }

  // Date methods
  getTodayDate(): Date {
    return new Date();
  }
}
