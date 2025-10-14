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
} from '../../shared/icons/lucide-icons';

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
    // First try progressive loading metadata (available immediately)
    const progressiveMetadata = this.contractStore.sectionsMetadata()?.data;
    if (progressiveMetadata) {
      return progressiveMetadata;
    }
    
    // Fallback to analysis metadata
    return this.contractStore.analysis()?.metadata || null;
  }

  getSummary() {
    // First try progressive loading summary (available after streaming)
    const progressiveSummary = this.contractStore.sectionsSummary()?.data;
    if (progressiveSummary !== undefined) {
      // Handle nested summary structure from AI response
      if (progressiveSummary && typeof progressiveSummary === 'object' && 'summary' in progressiveSummary) {
        return progressiveSummary.summary; // Extract the nested summary object
      }
      return progressiveSummary; // Can be null if extraction failed
    }
    
    // Fallback to analysis summary
    const analysis = this.contractStore.analysis();
    if (!analysis) return null;

    // If summary is a string, return null (components expect structured data)
    if (typeof analysis.summary === 'string') {
      return null;
    }

    // Return the structured summary object
    return analysis.summary || null;
  }

  getRisks() {
    // First try progressive loading risks (available after streaming)
    const progressiveRisks = this.contractStore.sectionsRisks()?.data;
    if (progressiveRisks) {
      return progressiveRisks.risks || [];
    }
    
    // Fallback to analysis clauses
    const analysis = this.contractStore.analysis();
    if (!analysis) return [];

    // Convert ContractClause[] to RiskFlag[] format expected by components
    return analysis.clauses.map((clause) => ({
      title: clause.type,
      description: clause.content,
      impact: clause.plainLanguage,
      severity: (clause.riskLevel === 'high'
        ? 'high'
        : clause.riskLevel === 'medium'
        ? 'medium'
        : 'low') as 'high' | 'medium' | 'low',
      icon: this.getRiskIcon(clause.type),
    }));
  }

  getObligations() {
    // First try progressive loading obligations (available after streaming)
    const progressiveObligations = this.contractStore.sectionsObligations()?.data;
    if (progressiveObligations !== undefined) {
      // Handle nested obligations structure from AI response
      if (progressiveObligations && typeof progressiveObligations === 'object' && 'obligations' in progressiveObligations) {
        return progressiveObligations.obligations; // Extract the nested obligations object
      }
      return progressiveObligations; // Can be null if extraction failed
    }
    
    // Fallback to analysis obligations
    const analysis = this.contractStore.analysis();
    if (!analysis) return null;

    // Convert Obligation[] to ObligationsData format expected by components
    const obligations = analysis.obligations || [];
    return {
      employer: obligations
        .filter((ob) => ob.party === 'their')
        .map((ob) => ({
          duty: ob.description,
          amount: null,
          frequency: null,
          startDate: ob.dueDate?.toISOString().split('T')[0] || null,
          duration: null,
          scope: null,
        })),
      employee: obligations
        .filter((ob) => ob.party === 'your')
        .map((ob) => ({
          duty: ob.description,
          amount: null,
          frequency: null,
          startDate: ob.dueDate?.toISOString().split('T')[0] || null,
          duration: null,
          scope: null,
        })),
    };
  }

  getOmissions() {
    // First try progressive loading omissions (available after streaming)
    const progressiveOmissions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveOmissions) {
      return progressiveOmissions.omissions || [];
    }
    
    // Fallback to analysis omissions
    const analysis = this.contractStore.analysis();
    if (!analysis) return [];

    // Convert to lowercase priority format expected by components
    return (analysis.omissions || []).map((omission) => ({
      item: omission.item,
      impact: omission.impact,
      priority: omission.priority.toLowerCase() as 'high' | 'medium' | 'low',
    }));
  }

  getQuestions() {
    // First try progressive loading questions (available after streaming)
    const progressiveQuestions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveQuestions) {
      return progressiveQuestions.questions || [];
    }
    
    // Fallback to analysis questions
    return this.contractStore.analysis()?.questions || [];
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
    return (
      this.contractStore.analysis()?.disclaimer ||
      'This analysis is for informational purposes only and should not be considered as legal advice.'
    );
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

    // Map role to appropriate badge
    const roleMap: Record<string, { icon: any; text: string; className: string }> = {
      employer: {
        icon: this.ClipboardIcon,
        text: 'Employer View',
        className:
          'px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full border border-blue-200',
      },
      employee: {
        icon: this.InfoIcon,
        text: 'Employee View',
        className:
          'px-3 py-1 text-sm font-medium bg-purple-100 text-purple-800 rounded-full border border-purple-200',
      },
    };

    return (
      roleMap[role] || {
        icon: this.InfoIcon,
        text: 'Your Perspective',
        className:
          'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200',
      }
    );
  }

  getPerspectiveContext() {
    const metadata = this.getMetadata();
    const role = metadata?.analyzedForRole;

    if (!role || role === 'both_views') {
      return null;
    }

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
    return this.contractStore.analysis()?.translationInfo?.wasTranslated ?? false;
  }

  getSourceLanguageName(): string {
    const code = this.contractStore.analysis()?.translationInfo?.sourceLanguage;
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
