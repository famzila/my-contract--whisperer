import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ContractStore, EmailDraftStore, UiStore } from '../../core/stores';
import { LanguageStore } from '../../core/stores/language.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { LoadingSpinner } from '../../shared/components/loading-spinner/loading-spinner';
import { TabsComponent, TabConfig } from '../../shared/components/tabs/tabs.component';
import { DashboardHeaderComponent } from './components/dashboard-header/dashboard-header.component';
import { SummaryTabComponent } from './components/summary-tab/summary-tab.component';
import { RisksTabComponent } from './components/risks-tab/risks-tab.component';
import { ObligationsTabComponent } from './components/obligations-tab/obligations-tab.component';
import { OmissionsTabComponent } from './components/omissions-tab/omissions-tab.component';
import { QuestionsTabComponent } from './components/questions-tab/questions-tab.component';
import { DisclaimerTabComponent } from './components/disclaimer-tab/disclaimer-tab.component';
import type { ContractClause } from '../../core/models/contract.model';
import type {
  AIAnalysisResponse,
  RiskSeverity,
  RiskEmoji,
} from '../../core/models/ai-analysis.model';
import { AppConfig } from '../../core/config/app.config';
import { isAppLanguageSupported, getLanguageTranslationKey } from '../../core/constants/languages';
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
import { Alert } from "../../shared/components/alert/alert";

@Component({
  selector: 'app-analysis-dashboard',
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    LoadingSpinner,
    TabsComponent,
    DashboardHeaderComponent,
    SummaryTabComponent,
    RisksTabComponent,
    ObligationsTabComponent,
    OmissionsTabComponent,
    QuestionsTabComponent,
    DisclaimerTabComponent,
    Alert
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
  GlobeIcon = Globe;
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
  
  // Email drafting state
  isDrafting = computed(() => this.emailStore.isDrafting());

  // Tab configuration using modern signals
  tabConfigs = computed<TabConfig[]>(() => [
    {
      id: 'summary',
      label: this.translate.instant('analysis.tabs.summary'),
      icon: this.ClipboardIcon,
      isLoading: this.isSummaryLoading(),
    },
    {
      id: 'risks',
      label: this.translate.instant('analysis.tabs.risks'),
      icon: this.AlertTriangleIcon,
      isLoading: this.isRisksLoading(),
      badge: this.getRisks()?.length || 0,
    },
    {
      id: 'obligations',
      label: this.translate.instant('analysis.tabs.obligations'),
      icon: this.ClockIcon,
      isLoading: this.isObligationsLoading(),
    },
    {
      id: 'omissions',
      label: this.translate.instant('analysis.tabs.omissions'),
      icon: this.FileXIcon,
      isLoading: this.isOmissionsLoading(),
      badge: this.getOmissions()?.length || 0,
    },
    {
      id: 'questions',
      label: this.translate.instant('analysis.tabs.questions'),
      icon: this.InfoIcon,
      isLoading: this.isOmissionsLoading(),
      badge: this.getQuestions()?.length || 0,
    },
    {
      id: 'disclaimer',
      label: this.translate.instant('analysis.tabs.disclaimer'),
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
  getMetadata() {
    // Get progressive loading metadata
    const progressiveMetadata = this.contractStore.sectionsMetadata()?.data;
    if (progressiveMetadata) {
      return progressiveMetadata;
    }
    
    return null;
  }

  getSummary() {
    // Get progressive loading summary
    const progressiveSummary = this.contractStore.sectionsSummary()?.data;
    if (progressiveSummary !== undefined) {
      // Handle nested summary structure from AI response
      if (progressiveSummary && typeof progressiveSummary === 'object' && 'summary' in progressiveSummary) {
        return progressiveSummary.summary; // Extract the nested summary object
      }
      return progressiveSummary; // Can be null if extraction failed
    }
    
    return null;
  }

  getRisks() {
    // Get progressive loading risks
    const progressiveRisks = this.contractStore.sectionsRisks()?.data;
    if (progressiveRisks) {
      return progressiveRisks.risks || [];
    }
    
    return [];
  }

  getObligations() {
    // Get progressive loading obligations
    const progressiveObligations = this.contractStore.sectionsObligations()?.data;
    if (progressiveObligations !== undefined) {
      // Handle nested obligations structure from AI response
      if (progressiveObligations && typeof progressiveObligations === 'object' && 'obligations' in progressiveObligations) {
        return progressiveObligations.obligations; // Extract the nested obligations object
      }
      return progressiveObligations; // Can be null if extraction failed
    }
    
    return null;
  }

  getOmissions() {
    // Get progressive loading omissions
    const progressiveOmissions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveOmissions) {
      return progressiveOmissions.omissions || [];
    }
    
    return [];
  }

  getQuestions() {
    // Get progressive loading questions
    const progressiveQuestions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveQuestions) {
      return progressiveQuestions.questions || [];
    }
    
    return [];
  }

  // Helper method to map clause types to risk icons
  private getRiskIcon(clauseType: string): string {
    const iconMap: Record<string, string> = {
      termination: 'AlertTriangle',
      payment: 'DollarSign',
      renewal: 'RefreshCw',
      liability: 'Shield',
      'governing-law': 'Scale',
      confidentiality: 'Lock',
      indemnity: 'Shield',
      warranty: 'CheckCircle',
      'dispute-resolution': 'Scale',
      'intellectual-property': 'Brain',
      other: 'Info',
    };
    return iconMap[clauseType] || 'Info';
  }

  getDisclaimer() {
    return this.translate.instant('analysis.disclaimer.text');
  }

  // Risk filtering methods
  getHighRisks() {
    return this.getRisks().filter((risk: any) => risk.severity === 'high');
  }

  getMediumRisks() {
    return this.getRisks().filter((risk: any) => risk.severity === 'medium');
  }

  getLowRisks() {
    return this.getRisks().filter((risk: any) => risk.severity === 'low');
  }

  // Omission filtering methods
  getHighPriorityOmissions() {
    return this.getOmissions().filter((omission: any) => omission.priority === 'high');
  }

  getMediumPriorityOmissions() {
    return this.getOmissions().filter((omission: any) => omission.priority === 'medium');
  }

  getLowPriorityOmissions() {
    return this.getOmissions().filter((omission: any) => omission.priority === 'low');
  }

  // Perspective and context methods
  getPerspectiveBadge() {
    const metadata = this.getMetadata();
    const role = metadata?.analyzedForRole;

    if (!role || role === 'both_views') {
      return role === 'both_views'
        ? {
            icon: this.ScaleIcon,
            text: 'Both Parties',
            className:
              'px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full border border-green-200',
          }
        : {
            icon: this.InfoIcon,
            text: 'Your Perspective',
            className:
              'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200',
          };
    }

    // Handle party1/party2 roles - use actual party names
    if (role === 'party1' && metadata?.parties?.party1) {
      const party = metadata.parties.party1;
      return {
        icon: this.ClipboardIcon,
        text: `From ${party.name} perspective`,
        className:
          'px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200',
      };
    }

    if (role === 'party2' && metadata?.parties?.party2) {
      const party = metadata.parties.party2;
      return {
        icon: this.InfoIcon,
        text: `From ${party.name} perspective`,
        className:
          'px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200',
      };
    }

    // Fallback: Try to find matching party by role name
    if (metadata?.parties) {
      const { party1, party2 } = metadata.parties;
      
      // Check if role matches party1's role (case-insensitive)
      if (party1?.role && party1.role.toLowerCase() === role.toLowerCase()) {
        return {
          icon: this.ClipboardIcon,
          text: `From ${party1.name} perspective`,
          className:
            'px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200',
        };
      }
      
      // Check if role matches party2's role (case-insensitive)
      if (party2?.role && party2.role.toLowerCase() === role.toLowerCase()) {
        return {
          icon: this.InfoIcon,
          text: `From ${party2.name} perspective`,
          className:
            'px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200',
        };
      }
    }

    // Final fallback: show the role name
    return {
      icon: this.InfoIcon,
      text: `From ${role} perspective`,
      className:
        'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200',
    };
  }

  getPerspectiveContext() {
    const metadata = this.getMetadata();
    const role = metadata?.analyzedForRole;

    if (!role || role === 'both_views') {
      return null;
    }

    // todo translate
    const contextMap: Record<string, { icon: any; title: string; message: string }> = {
      employer: {
        icon: this.ClipboardIcon,
        title: 'Employer Perspective',
        message:
          "This analysis focuses on the employer's obligations, rights, and potential risks from the employer's point of view.",
      },
      employee: {
        icon: this.InfoIcon,
        title: 'Employee Perspective',
        message:
          "This analysis focuses on the employee's obligations, rights, and potential risks from the employee's point of view.",
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
    const questions = this.getQuestions();
    const questionsText = questions
      .map((q: string, index: number) => `${index + 1}. ${q}`)
      .join('\n\n');
    navigator.clipboard.writeText(questionsText);
    this.copyAllButtonState.set('copied');
    setTimeout(() => this.copyAllButtonState.set('copy'), 2000);
  }

  /**
   * Draft a professional email with questions using Writer API
   * Delegates to EmailDraftStore
   */
  async draftProfessionalEmail(): Promise<void> {
    const metadata = this.getMetadata();
    const questions = this.getQuestions();
    
    if (!metadata || !questions.length) return;
    
    const selectedRole = metadata.analyzedForRole;
    const parties = metadata.parties;
    
    // Determine who is the sender (you) and who is the recipient (them)
    let senderName = 'you';
    let recipientName = 'the other party';
    let senderRole = '';
    let recipientRole = '';
    
    if (parties?.party1 && parties?.party2) {
      if (parties.party1.role?.toLowerCase() === selectedRole?.toLowerCase()) {
        // Viewing as party1 - you ARE party1, email TO party2
        senderName = parties.party1.name;
        recipientName = parties.party2.name;
        senderRole = parties.party1.role || '';
        recipientRole = parties.party2.role || '';
      } else if (parties.party2.role?.toLowerCase() === selectedRole?.toLowerCase()) {
        // Viewing as party2 - you ARE party2, email TO party1
        senderName = parties.party2.name;
        recipientName = parties.party1.name;
        senderRole = parties.party2.role || '';
        recipientRole = parties.party1.role || '';
      }
    }
    
    console.log(`✉️ [Email] Drafting from ${senderName} (${senderRole}) TO ${recipientName} (${recipientRole})`);
    
    // Delegate to EmailDraftStore
    await this.emailStore.draftEmail(questions, recipientName, senderName, senderRole, recipientRole);
    
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
    const metadata = this.getMetadata();
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
