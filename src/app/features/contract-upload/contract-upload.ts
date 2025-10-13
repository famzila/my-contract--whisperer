import { ChangeDetectionStrategy, Component, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService  } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
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
  Search 
} from '../../shared/icons/lucide-icons';
import { ContractStore } from '../../core/stores/contract.store';
import { UiStore } from '../../core/stores/ui.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { LanguageStore } from '../../core/stores/language.store';
import { ContractParserService } from '../../core/services/contract-parser.service';
import { ModalService } from '../../core/services/modal.service';

type UploadMode = 'file' | 'text';

@Component({
  selector: 'app-contract-upload',
  imports: [CommonModule, FormsModule, TranslatePipe, LucideAngularModule],
  templateUrl: './contract-upload.html',
  styleUrl: './contract-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractUpload {
  // Stores and services
  contractStore = inject(ContractStore);
  onboardingStore = inject(OnboardingStore);
  languageStore = inject(LanguageStore);
  translate = inject(TranslateService);
  
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
  private parserService = inject(ContractParserService);
  private uiStore = inject(UiStore);
  private router = inject(Router);
  private modalService = inject(ModalService);

  // Local UI state
  mode = signal<UploadMode>('file');
  contractText = signal('');
  isDragging = signal(false);
  private partySelectorDialogRef: any = null;

  constructor() {
    effect(() => {
      // Watch for party selection needs and open modal automatically
      if (this.onboardingStore.needsPartySelection() && !this.partySelectorDialogRef) {
        this.openPartySelector();
      }
    });

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
      console.log(`👤 [Selection] User selected Party 1 (${detectedParties.parties.party1.name}) → Role: ${actualRole}`);
    } else if (role === 'party2' && detectedParties?.parties?.party2) {
      // Map party2 to its actual role (e.g., 'tenant', 'employee')
      actualRole = this.mapPartyRoleToUserRole(detectedParties.parties.party2.role);
      console.log(`👤 [Selection] User selected Party 2 (${detectedParties.parties.party2.name}) → Role: ${actualRole}`);
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
    this.uiStore.showToast('Analyzing contract...', 'info');
    
    try {
      // Re-parse and analyze with selected role
      const parsedContract = this.parserService.parseText(pendingText, 'pending-analysis');
      await this.contractStore.analyzeContract(parsedContract);
      
      this.uiStore.showToast('Contract analyzed successfully!', 'success');
      await this.router.navigate(['/analysis']);
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
      'Landlord': 'landlord',
      'Tenant': 'tenant',
      'Employer': 'employer',
      'Employee': 'employee',
      'Client': 'client',
      'Contractor': 'contractor',
      'Partner': 'partner',
      'Lessor': 'landlord',
      'Lessee': 'tenant',
    };
    
    return roleMap[partyRole] || partyRole.toLowerCase();
  }

  /**
   * Handle language selection - use contract language (no translation)
   */
  selectContractLanguage(): void {
    const detectedLang = this.onboardingStore.detectedLanguage();
    console.log('👤 [Language Choice] User selected: Keep original', detectedLang);
    if (detectedLang) {
      this.onboardingStore.setSelectedLanguage(detectedLang);
      // Note: Do NOT change user's app language preference - only analysis output language
      console.log('✅ [Language Choice] Analysis will be in original language (no translation)');
    }
  }

  /**
   * Handle language selection - use user's preferred language (with translation)
   */
  selectUserLanguage(): void {
    const userLang = this.languageStore.preferredLanguage();
    console.log('👤 [Language Choice] User selected:', userLang, '(will translate from', this.onboardingStore.detectedLanguage(), ')');
    this.onboardingStore.setSelectedLanguage(userLang);
    console.log('✅ [Language Choice] Analysis will be translated to user preferred language');
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string | null): string {
    if (!code) return this.translate.instant('languages.unknown');
    
    // Map language codes to translation keys
    const languageKeyMap: Record<string, string> = {
      'en': 'languages.english',
      'fr': 'languages.french',
      'ar': 'languages.arabic',
      'es': 'languages.spanish',
      'de': 'languages.german',
      'ja': 'languages.japanese',
      'zh': 'languages.chinese',
      'ko': 'languages.korean',
    };
    
    const translationKey = languageKeyMap[code];
    return translationKey ? this.translate.instant(translationKey) : code.toUpperCase();
  }

  /**
   * Get language flag emoji from code
   */
  getLanguageFlag(code: string | null): string {
    if (!code) return '🌍';
    const lang = this.languageStore.availableLanguages().find(l => l.code === code);
    return lang?.flag || '🌍';
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
    return text.split(/\s+/).filter(word => word.length > 0).length;
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
    this.modalService.openSampleContract();
  }

  /**
   * Show how it works information
   */
  showHowItWorks(): void {
    this.modalService.openHowItWorks();
  }

  /**
   * Show privacy policy
   */
  showPrivacyPolicy(): void {
    this.modalService.openPrivacyPolicy();
  }

  /**
   * Open party selector modal
   */
  openPartySelector(): void {
    if (this.partySelectorDialogRef) {
      return; // Already open
    }
    
    this.partySelectorDialogRef = this.modalService.openPartySelector({
      data: {
        detectedParties: this.onboardingStore.detectedParties()
      }
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
