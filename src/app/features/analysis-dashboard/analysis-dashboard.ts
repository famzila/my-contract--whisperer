import { ChangeDetectionStrategy, Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateService, TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ContractStore, EmailDraftStore, UiStore } from '../../core/stores';
import { LanguageStore } from '../../core/stores/language.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { Card, LoadingSpinner, Button } from '../../shared/components';
import { SkeletonLoader } from '../../shared/components/skeleton-loader';
import type { ContractClause } from '../../core/models/contract.model';
import type { AIAnalysisResponse, RiskSeverity, RiskEmoji } from '../../core/models/ai-analysis.model';
import { AppConfig } from '../../core/config/app.config';
import { isAppLanguageSupported, getLanguageTranslationKey } from '../../core/constants/languages';
import { 
  Theater, 
  Globe, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  Clipboard, 
  Scale, 
  CheckCircle, 
  Info, 
  Lightbulb, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Mail, 
  Copy, 
  Edit,
  Wrench,
  Shield,
  FileX,
  Users,
  Briefcase,
  DollarSign,
  DoorOpen,
  User,
  Building2,
  Home,
  Key,
  Handshake,
  Check,
  AlertCircle,
  Calendar
} from '../../shared/icons/lucide-icons';

@Component({
  selector: 'app-analysis-dashboard',
  imports: [
    CommonModule, 
    LucideAngularModule, 
    Card, 
    LoadingSpinner, 
    Button, 
    TranslatePipe,
    SkeletonLoader,
    DatePipe
  ],
  templateUrl: './analysis-dashboard.html',
  styleUrl: './analysis-dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalysisDashboard implements OnInit {
  private router = inject(Router);

  // Stores
  contractStore = inject(ContractStore);
  emailStore = inject(EmailDraftStore);
  languageStore = inject(LanguageStore);
  onboardingStore = inject(OnboardingStore);

  // Services
  translate = inject(TranslateService);
  private uiStore = inject(UiStore);
  
  // Lucide icons
  readonly TheaterIcon = Theater;
  readonly GlobeIcon = Globe;
  readonly RefreshCwIcon = RefreshCw;
  readonly FileTextIcon = FileText;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly ClipboardIcon = Clipboard;
  readonly ScaleIcon = Scale;
  readonly CheckCircleIcon = CheckCircle;
  readonly InfoIcon = Info;
  readonly LightbulbIcon = Lightbulb;
  readonly BarChart3Icon = BarChart3;
  readonly TrendingUpIcon = TrendingUp;
  readonly TrendingDownIcon = TrendingDown;
  readonly ClockIcon = Clock;
  readonly MailIcon = Mail;
  readonly CopyIcon = Copy;
  readonly EditIcon = Edit;
  readonly WrenchIcon = Wrench;
  readonly ShieldIcon = Shield;
  readonly FileXIcon = FileX;
  readonly UsersIcon = Users;
  readonly BriefcaseIcon = Briefcase;
  readonly DollarSignIcon = DollarSign;
  readonly DoorOpenIcon = DoorOpen;
  readonly UserIcon = User;
  readonly Building2Icon = Building2;
  readonly HomeIcon = Home;
  readonly KeyIcon = Key;
  readonly HandshakeIcon = Handshake;
  readonly CheckIcon = Check;
  readonly AlertCircleIcon = AlertCircle;
  readonly CalendarIcon = Calendar;
  
  // Local UI state only
  selectedTab = signal<'summary' | 'risks' | 'obligations' | 'omissions' | 'questions' | 'disclaimer'>('summary');
  expandedQuestionId = signal<string | null>(null);
  copyAllButtonState = signal<'copy' | 'copied'>('copy');
  
  // Parsed structured data from AI JSON response
  structuredData = signal<AIAnalysisResponse | null>(null);
  
  // 🚀 Progressive loading states (computed from store)
  isMetadataLoading = computed(() => this.contractStore.sectionsMetadata()?.loading || false);
  isSummaryLoading = computed(() => this.contractStore.sectionsSummary()?.loading || false);
  isRisksLoading = computed(() => this.contractStore.sectionsRisks()?.loading || false);
  isObligationsLoading = computed(() => this.contractStore.sectionsObligations()?.loading || false);
  isOmissionsLoading = computed(() => this.contractStore.sectionsOmissionsQuestions()?.loading || false);
  
  // 🌍 Translation state
  showingOriginal = signal(false);  // Toggle between translated and original

  // 🌍 Language mismatch banner computed signals
  showLanguageMismatchBanner = computed(() => {
    const appLang = this.languageStore.preferredLanguage();
    const detectedLang = this.languageStore.detectedContractLanguage();
    return appLang !== detectedLang && detectedLang !== null;
  });

  canSwitchAppLanguage = computed(() => {
    const detectedLang = this.languageStore.detectedContractLanguage();
    return detectedLang ? isAppLanguageSupported(detectedLang) : false;
  });

  analysisLanguageName = computed(() => {
    const lang = this.languageStore.detectedContractLanguage();
    return this.getLanguageNameByCode(lang || 'en');
  });

  appLanguageName = computed(() => {
    const lang = this.languageStore.preferredLanguage();
    return this.getLanguageNameByCode(lang);
  });

  // Check if mock mode is enabled
  isMockMode = AppConfig.useMockAI;

  ngOnInit(): void {
    // With progressive loading, we only need metadata to show the page
    // Analysis sections will load progressively with skeleton loaders
    if (!this.contractStore.canShowDashboard()) {
      this.router.navigate(['/upload']);
      return;
    }
    
    // Parse AI response into sections (will happen progressively as data arrives)
    if (this.contractStore.hasAnalysis()) {
      this.parseAIResponse();
    }
  }

  /**
   * Check if analysis was translated
   */
  wasTranslated = (): boolean => {
    return this.contractStore.analysis()?.translationInfo?.wasTranslated ?? false;
  };
  
  /**
   * Get source language name for display
   */
  getSourceLanguageName(): string {
    const code = this.contractStore.analysis()?.translationInfo?.sourceLanguage;
    if (!code) return this.translate.instant('languages.unknown');

    const translationKey = getLanguageTranslationKey(code);
    return this.translate.instant(translationKey);
  }

  /**
   * Get language name by code (for banner)
   */
  private getLanguageNameByCode(code: string): string {
    const translationKey = getLanguageTranslationKey(code);
    return this.translate.instant(translationKey);
  }

  /**
   * Switch app language to analysis language
   */
  switchAppToAnalysisLanguage(): void {
    const detectedLang = this.languageStore.detectedContractLanguage();
    if (detectedLang && isAppLanguageSupported(detectedLang)) {
      this.languageStore.setPreferredLanguage(detectedLang);
    }
  }

  /**
   * Toggle between translated and original content
   */
  toggleOriginal(): void {
    this.showingOriginal.update(v => !v);
    
    // Re-parse AI response to show original or translated
    this.parseAIResponse();
  }
  
  /**
   * Parse AI response - build structured data from analysis object
   */
  private parseAIResponse(): void {
    const analysis = this.contractStore.analysis();
    if (!analysis) return;
    
    // 🌍 Check if we should use original or translated
    const useOriginal = this.showingOriginal() && analysis.originalSummary;
    const summaryToUse = useOriginal ? analysis.originalSummary : analysis.summary;
    
    // First, try to parse summary as JSON if it's a string
    let parsedFromSummary: AIAnalysisResponse | null = null;
    if (typeof summaryToUse === 'string') {
      try {
        // Clean up markdown code blocks if present
        let cleanedSummary = summaryToUse.trim();
        
        // Remove markdown code blocks (```json ... ``` or ``` ... ```)
        if (cleanedSummary.startsWith('```')) {
          cleanedSummary = cleanedSummary.replace(/^```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '');
        }
        
        parsedFromSummary = JSON.parse(cleanedSummary);
        
        // CRITICAL FIX: Check if summary.parties is ALSO a JSON string (double-wrapped)
        if (parsedFromSummary && parsedFromSummary.summary && typeof parsedFromSummary.summary.parties === 'string') {
          const partiesStr = parsedFromSummary.summary.parties.trim();
          if (partiesStr.startsWith('```') || partiesStr.startsWith('{')) {
            try {
              // Try to extract the inner JSON
              let innerJson = partiesStr;
              if (innerJson.startsWith('```')) {
                innerJson = innerJson.replace(/^```(?:json)?\s*\n?/g, '').replace(/\n?```\s*$/g, '');
              }
              const innerParsed = JSON.parse(innerJson);
              // Replace the entire parsed structure with the inner one
              parsedFromSummary = innerParsed;
            } catch (innerError) {
              // Could not parse inner JSON, using outer structure
            }
          }
        }
      } catch (error) {
        // Summary is not JSON, will use structured fields
      }
    }
    
    // If we successfully parsed JSON from summary, transform it
    // (We now always use the new schema format)
    if (parsedFromSummary) {
      const transformed = this.transformNewSchemaFormat(parsedFromSummary);
      this.structuredData.set(transformed);
      return;
    }
    
    // Otherwise, check if analysis already has structured data (new format)
    if (analysis.metadata || analysis.omissions || analysis.questions) {
      // Build AIAnalysisResponse from analysis fields
      const structured: AIAnalysisResponse = {
        metadata: analysis.metadata || {
          contractType: this.translate.instant('analysis.unknownContractType'),
          effectiveDate: null,
          endDate: null,
          duration: null,
          autoRenew: null,
          jurisdiction: null,
          parties: {
            employer: { name: 'N/A', location: null },
            employee: { name: 'N/A', location: null }
          }
        },
        summary: typeof analysis.summary === 'object' ? analysis.summary : {
          parties: analysis.summary || 'N/A',
          role: 'N/A',
          responsibilities: [],
          compensation: {},
          benefits: [],
          termination: {},
          restrictions: {},
          fromYourPerspective: analysis.summary || 'N/A',
          keyBenefits: [],
          keyConcerns: []
        },
        risks: analysis.clauses
          .filter(c => c.riskLevel !== 'safe')
          .map(c => ({
            title: c.plainLanguage.substring(0, 50) + '...',  // Use plainLanguage as title
            severity: (c.riskLevel === 'high' ? 'High' : c.riskLevel === 'medium' ? 'Medium' : 'Low') as RiskSeverity,
            emoji: (c.riskLevel === 'high' ? '🚨' : c.riskLevel === 'medium' ? '⚠️' : 'ℹ️') as RiskEmoji,
            description: c.plainLanguage,
            impact: `${this.translate.instant('analysis.risks.riskLevel')}: ${c.riskLevel}`,  // Required field
            impactOn: 'both',
            contextWarning: null
          })),
        obligations: {
          employer: analysis.obligations?.filter(o => o.party === 'their').map(o => ({
            duty: o.description,
            amount: null,
            frequency: null,
            startDate: null,
            duration: null,
            scope: null
          })) || [],
          employee: analysis.obligations?.filter(o => o.party === 'your').map(o => ({
            duty: o.description,
            amount: null,
            frequency: null,
            startDate: null,
            duration: null,
            scope: null
          })) || []
        },
        omissions: analysis.omissions?.map(o => ({
          item: o.item,
          impact: o.impact,  // Already has 'impact' field
          priority: o.priority || ('Medium' as 'High' | 'Medium' | 'Low')  // Use existing priority or default
        })) || [],
        questions: analysis.questions || [],
        contextWarnings: analysis.contextWarnings as any,  // Type cast for now
        disclaimer: this.translate.instant('analysis.disclaimer.text')
      };
      
      this.structuredData.set(structured);
      return;
    }
    
    // No structured data available
    this.structuredData.set(null);
  }

  /**
   * Transform new schema format to expected AIAnalysisResponse format
   * Converts lowercase severity to capitalized, adds emoji for backward compatibility
   */
  private transformNewSchemaFormat(parsed: any): AIAnalysisResponse {

    // Transform risks: lowercase severity → capitalized, add emoji from icon
    const transformedRisks = parsed.risks.risks.map((risk: any) => ({
      ...risk,
      severity: this.capitalizeSeverity(risk.severity) as RiskSeverity,
      emoji: this.getEmojiFromIcon(risk.icon) as RiskEmoji,
    }));

    // Transform omissions: lowercase priority → capitalized
    const transformedOmissions = parsed.omissionsAndQuestions.omissions.map((omission: any) => ({
      ...omission,
      priority: this.capitalizeSeverity(omission.priority) as 'High' | 'Medium' | 'Low',
    }));

    return {
      metadata: parsed.metadata,
      summary: parsed.summary.summary,
      risks: transformedRisks,
      obligations: parsed.obligations.obligations,
      omissions: transformedOmissions,
      questions: parsed.omissionsAndQuestions.questions,
      disclaimer: this.translate.instant('analysis.disclaimer.text'),
    };
  }

  /**
   * Capitalize severity/priority (high → High, medium → Medium, low → Low)
   */
  private capitalizeSeverity(severity: string): string {
    return severity.charAt(0).toUpperCase() + severity.slice(1);
  }

  /**
   * Get emoji from Lucide icon name for backward compatibility
   */
  private getEmojiFromIcon(iconName: string): string {
    const iconToEmoji: Record<string, string> = {
      'alert-triangle': '🚨',
      'alert-circle': '⚠️',
      'info': 'ℹ️',
    };
    return iconToEmoji[iconName] || '⚠️';
  }

  /**
   * Get Lucide icon component from icon name
   * Used in template to render icons from schema
   */
  getRiskLucideIcon(iconName: string): any {
    const iconMap: Record<string, any> = {
      'alert-triangle': AlertTriangle,
      'alert-circle': AlertCircle,
      'info': Info,
    };
    return iconMap[iconName] || AlertCircle;
  }

  /**
   * Switch tab
   */
  selectTab(tab: 'summary' | 'risks' | 'obligations' | 'omissions' | 'questions' | 'disclaimer'): void {
    this.selectedTab.set(tab);
  }

  /**
   * Toggle question expansion
   */
  toggleQuestion(questionId: string): void {
    const current = this.expandedQuestionId();
    this.expandedQuestionId.set(current === questionId ? null : questionId);
  }
  
  /**
   * Copy question to clipboard
   */
  async copyQuestion(question: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(question);
      console.log('✅ Question copied to clipboard');
    } catch (err) {
      console.error('❌ Failed to copy question:', err);
    }
  }

  /**
   * Copy all questions to clipboard
   */
  async copyAllQuestions(): Promise<void> {
    try {
      const questions = this.getQuestions();
      const questionsText = questions.map((q, index) => `${index + 1}. ${q}`).join('\n\n');
      await navigator.clipboard.writeText(questionsText);
      console.log('✅ All questions copied to clipboard');
      
      // Show temporary "copied" state
      this.copyAllButtonState.set('copied');
      setTimeout(() => {
        this.copyAllButtonState.set('copy');
      }, 2000); // Revert after 2 seconds
    } catch (err) {
      console.error('❌ Failed to copy all questions:', err);
    }
  }

  /**
   * Get risk level color
   */
  getRiskColor(risk: string): string {
    switch (risk) {
      case 'high':
        return 'bg-error text-white';
      case 'medium':
        return 'bg-warning text-white';
      case 'low':
        return 'bg-risk-low text-white';
      case 'safe':
        return 'bg-risk-safe text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  }

  /**
   * Get risk level icon
   */
  getRiskIcon(risk: string): string {
    switch (risk) {
      case 'high':
        return '🚨';
      case 'medium':
        return '⚠️';
      case 'low':
        return '⚡';
      case 'safe':
        return '✅';
      default:
        return '❔';
    }
  }

  /**
   * Get risk score label
   */
  getRiskScoreLabel(score: number): string {
    if (score >= 80) return 'High Risk';
    if (score >= 50) return 'Medium Risk';
    if (score >= 20) return 'Low Risk';
    return 'Safe';
  }

  /**
   * Get risk score color
   */
  getRiskScoreColor(score: number): string {
    if (score >= 80) return 'text-error';
    if (score >= 50) return 'text-warning';
    if (score >= 20) return 'text-risk-low';
    return 'text-risk-safe';
  }

  /**
   * Format date
   */
  formatDate(date?: Date): string {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Get priority color
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high':
        return 'text-error';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * Upload new contract
   */
  uploadNew(): void {
    this.contractStore.reset();
    this.router.navigate(['/upload']);
  }
  
  /**
   * Get risks - use progressive loading data if available, fallback to structured data
   */
  getRisks() {
    // First try progressive loading risks (available after Tier 2)
    const progressiveRisks = this.contractStore.sectionsRisks()?.data;
    if (progressiveRisks) {
      return progressiveRisks.risks || [];
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.risks || [];
  }
  
  /**
   * Get omissions - use progressive loading data if available, fallback to structured data
   */
  getOmissions() {
    // First try progressive loading omissions (available after Tier 3)
    const progressiveOmissions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveOmissions) {
      return progressiveOmissions.omissions || [];
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.omissions || [];
  }
  
  /**
   * Get questions - use progressive loading data if available, fallback to structured data
   */
  getQuestions(): string[] {
    // First try progressive loading questions (available after Tier 3)
    const progressiveQuestions = this.contractStore.sectionsOmissionsQuestions()?.data;
    if (progressiveQuestions) {
      return progressiveQuestions.questions || [];
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.questions || [];
  }
  
  /**
   * Get summary - use progressive loading data if available, fallback to structured data
   */
  getSummary() {
    // First try progressive loading summary (available after Tier 2)
    const progressiveSummary = this.contractStore.sectionsSummary()?.data;
    if (progressiveSummary !== undefined) {
      // Handle nested summary structure from AI response
      if (progressiveSummary && typeof progressiveSummary === 'object' && 'summary' in progressiveSummary) {
        return progressiveSummary.summary; // Extract the nested summary object
      }
      return progressiveSummary; // Can be null if extraction failed
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.summary || null;
  }
  
  /**
   * Get obligations - use progressive loading data if available, fallback to structured data
   */
  getObligations() {
    // First try progressive loading obligations (available after Tier 3)
    const progressiveObligations = this.contractStore.sectionsObligations()?.data;
    if (progressiveObligations !== undefined) {
      // Handle nested obligations structure from AI response
      if (progressiveObligations && typeof progressiveObligations === 'object' && 'obligations' in progressiveObligations) {
        return progressiveObligations.obligations; // Extract the nested obligations object
      }
      return progressiveObligations; // Can be null if extraction failed
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.obligations || null;
  }
  
  /**
   * Get disclaimer text
   */
  getDisclaimer(): string {
    return this.translate.instant('analysis.disclaimer.text');
  }
  
  /**
   * Get metadata - use progressive loading data if available, fallback to structured data
   */
  getMetadata() {
    // First try progressive loading metadata (available immediately)
    const progressiveMetadata = this.contractStore.sectionsMetadata()?.data;
    if (progressiveMetadata) {
      return progressiveMetadata;
    }
    
    // Fallback to structured data (when complete analysis is done)
    return this.structuredData()?.metadata || null;
  }
  
  /**
   * Get perspective badge info - shows party name, not role
   */
  getPerspectiveBadge() {
    const metadata = this.getMetadata();
    const role = metadata?.analyzedForRole;
    
    if (!role || role === 'both_views') {
      return role === 'both_views' ? {
        icon: this.ScaleIcon,
        text: 'Both Parties',
        className: 'px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full border border-green-200'
      } : {
        icon: this.UserIcon,
        text: 'Your Perspective',
        className: 'px-3 py-1 text-sm font-medium bg-gray-100 text-gray-800 rounded-full border border-gray-200'
      };
    }
    
    // Find which party matches the selected role
    const parties = metadata?.parties;
    let partyName = '';
    let partyRole = '';
    
    if (parties?.party1?.role?.toLowerCase() === role.toLowerCase()) {
      partyName = parties.party1.name;
      partyRole = parties.party1.role || role;
    } else if (parties?.party2?.role?.toLowerCase() === role.toLowerCase()) {
      partyName = parties.party2.name;
      partyRole = parties.party2.role || role;
    }
    
    // Icon based on role
    const iconMap: Record<string, any> = {
      'employee': this.UserIcon,
      'employer': this.BriefcaseIcon,
      'contractor': this.WrenchIcon,
      'client': this.Building2Icon,
      'tenant': this.HomeIcon,
      'landlord': this.KeyIcon,
      'partner': this.HandshakeIcon,
      'your': this.UserIcon,
    };
    
    // Color based on role
    const colorMap: Record<string, string> = {
      'employee': 'bg-blue-100 text-blue-800 border-blue-200',
      'employer': 'bg-purple-100 text-purple-800 border-purple-200',
      'contractor': 'bg-orange-100 text-orange-800 border-orange-200',
      'client': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'tenant': 'bg-teal-100 text-teal-800 border-teal-200',
      'landlord': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'partner': 'bg-pink-100 text-pink-800 border-pink-200',
      'your': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    
    const icon = iconMap[role] || '👤';
    const colorClass = colorMap[role] || 'bg-gray-100 text-gray-800 border-gray-200';
    
    return {
      icon,
      text: this.translate.instant('analysis.badge.fromPerspective', { name: partyName }),
      className: `px-3 py-1 text-sm font-medium ${colorClass} rounded-full border`
    };
  }
  
  /**
   * Get perspective context message for summary tab
   */
  getPerspectiveContext() {
    const metadata = this.getMetadata();
    const role = metadata?.analyzedForRole;
    
    if (!role) return null;
    
    const contexts: Record<string, { icon: any; title: string; message: string }> = {
      'employee': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.employeeTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.employeeDescription')
      },
      'employer': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.employerTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.employerDescription')
      },
      'contractor': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.contractorTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.contractorDescription')
      },
      'client': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.clientTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.clientDescription')
      },
      'tenant': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.tenantTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.tenantDescription')
      },
      'landlord': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.landlordTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.landlordDescription')
      },
      'partner': {
        icon: this.BarChart3Icon,
        title: this.translate.instant('analysis.perspectiveAnalysis.partnerTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.partnerDescription')
      },
      'both_views': {
        icon: this.ScaleIcon,
        title: this.translate.instant('analysis.perspectiveAnalysis.bothTitle'),
        message: this.translate.instant('analysis.perspectiveAnalysis.bothDescription')
      }
    };
    
    return contexts[role] || null;
  }
  
  /**
   * Check if contract is expiring soon (within 30 days)
   */
  isContractExpiringSoon(): boolean {
    const metadata = this.getMetadata();
    const endDate = metadata?.endDate;
    
    if (!endDate) return false;
    
    try {
      const end = new Date(endDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    } catch (error) {
      return false;
    }
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
    
    // These roles typically RECEIVE the contract (they need clarification)
    // const receiverRoles = ['employee', 'tenant', 'contractor'];
    
    // Special cases:
    // - 'partner': Could be either, so ALLOW email drafting
    // - 'both_views': Not a real perspective, so HIDE email drafting
    if (role === 'both_views') return true; // Hide for both views
    if (role === 'partner') return false; // Allow for partners
    
    return providerRoles.includes(role);
  }
  
  /**
   * Get high priority risks
   */
  getHighRisks() {
    return this.getRisks().filter((r: { severity: string; }) => r.severity === 'high');
  }
  
  /**
   * Get medium priority risks
   */
  getMediumRisks() {
    return this.getRisks().filter((r: { severity: string; }) => r.severity === 'medium');
  }
  
  /**
   * Get low priority risks
   */
  getLowRisks() {
    return this.getRisks().filter((r: { severity: string; }) => r.severity === 'low');
  }
  
  /**
   * Get high priority omissions
   */
  getHighPriorityOmissions() {
    return this.getOmissions().filter((o: { priority: string; }) => o.priority === 'high');
  }
  
  /**
   * Get medium priority omissions
   */
  getMediumPriorityOmissions() {
    return this.getOmissions().filter((o: { priority: string; }) => o.priority === 'medium');
  }
  
  /**
   * Get low priority omissions
   */
  getLowPriorityOmissions() {
    return this.getOmissions().filter((o: { priority: string; }) => o.priority === 'low');
  }
  
  /**
   * Format obligation display text
   */
  formatObligation(obl: any): string {
    let text = obl.duty;
    
    if (obl.amount) {
      text += ` • $${obl.amount.toLocaleString()}`;
    }
    if (obl.frequency) {
      text += ` • ${obl.frequency}`;
    }
    if (obl.startDate) {
      text += ` • Starts: ${obl.startDate}`;
    }
    if (obl.duration) {
      text += ` • Duration: ${obl.duration}`;
    }
    if (obl.scope && !obl.amount && !obl.frequency) {
      text += ` • ${obl.scope}`;
    }
    
    return text;
  }
  
  /**
   * Draft a professional email with questions using Writer API
   * Delegates to EmailDraftStore
   */
  async draftProfessionalEmail(): Promise<void> {
    const data = this.structuredData();
    if (!data) return;
    
    const questions = data.questions;
    const selectedRole = data.metadata.analyzedForRole;
    const parties = data.metadata.parties;
    
    // Determine who is the sender (you) and who is the recipient (them)
    // If viewing as party1 (e.g., landlord), YOU are party1, THEY are party2
    // If viewing as party2 (e.g., tenant), YOU are party2, THEY are party1
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

    const dialogRef = this.uiStore.openEmailDraft(emailData);
  }

  /**
   * Copy drafted email to clipboard
   * Delegates to EmailDraftStore
   */
  async copyDraftedEmail(): Promise<void> {
    const success = await this.emailStore.copyEmail();
    if (success) {
      // TODO: Show toast notification
    }
  }
  
  /**
   * Close email draft modal
   * Delegates to EmailDraftStore
   */
  closeDraftedEmail(): void {
    this.emailStore.clearEmail();
  }
  
  /**
   * Toggle rewrite options panel
   * Delegates to EmailDraftStore
   */
  toggleRewriteOptions(): void {
    this.emailStore.toggleRewriteOptions();
  }
  
  /**
   * Rewrite email with new tone/length
   * Delegates to EmailDraftStore
   */
  async rewriteEmail(): Promise<void> {
    await this.emailStore.rewriteEmail();
  }

  /**
   * Update rewrite option (tone or length)
   * Delegates to EmailDraftStore
   */
  updateRewriteOption(key: string, value: string): void {
    if (key === 'tone') {
      this.emailStore.setRewriteTone(value as 'formal' | 'neutral' | 'casual');
    } else if (key === 'length') {
      this.emailStore.setRewriteLength(value as 'short' | 'medium' | 'long');
    }
  }
  
  /**
   * Set rewrite tone
   * Delegates to EmailDraftStore
   */
  setRewriteTone(tone: 'formal' | 'neutral' | 'casual'): void {
    this.emailStore.setRewriteTone(tone);
  }
  
  /**
   * Set rewrite length
   * Delegates to EmailDraftStore
   */
  setRewriteLength(length: 'short' | 'medium' | 'long'): void {
    this.emailStore.setRewriteLength(length);
  }
  
  /**
   * Get today's date for display
   * Returns current date that will be formatted by Angular's DatePipe
   */
  getTodayDate(): Date {
    return new Date();
  }
}
