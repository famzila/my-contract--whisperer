import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ContractStore } from '../../core/stores/contract.store';
import { UiStore } from '../../core/stores/ui.store';
import { OnboardingStore } from '../../core/stores/onboarding.store';
import { LanguageStore } from '../../core/stores/language.store';
import { ContractParserService } from '../../core/services/contract-parser.service';
import { PartySelectorModal } from '../../shared/components/party-selector-modal/party-selector-modal';
import { NonContractError } from '../../shared/components/non-contract-error/non-contract-error';

type UploadMode = 'file' | 'text';

@Component({
  selector: 'app-contract-upload',
  imports: [CommonModule, FormsModule, PartySelectorModal, NonContractError],
  templateUrl: './contract-upload.html',
  styleUrl: './contract-upload.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContractUpload {
  // Stores and services
  contractStore = inject(ContractStore);
  onboardingStore = inject(OnboardingStore);
  languageStore = inject(LanguageStore);
  private parserService = inject(ContractParserService);
  private uiStore = inject(UiStore);
  private router = inject(Router);

  // Local UI state
  mode = signal<UploadMode>('file');
  contractText = signal('');
  isDragging = signal(false);

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
    
    // Set role in onboarding store
    this.onboardingStore.setSelectedRole(role as any);
    
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
   * Handle language selection - use contract language
   */
  selectContractLanguage(): void {
    const detectedLang = this.onboardingStore.detectedLanguage();
    console.log('👤 User selected contract language:', detectedLang);
    if (detectedLang) {
      this.onboardingStore.setSelectedLanguage(detectedLang);
      this.languageStore.setPreferredLanguage(detectedLang);
      console.log('✅ Language set to contract language:', detectedLang);
    }
  }

  /**
   * Handle language selection - use user's preferred language
   */
  selectUserLanguage(): void {
    const userLang = this.languageStore.preferredLanguage();
    console.log('👤 User selected their preferred language:', userLang);
    this.onboardingStore.setSelectedLanguage(userLang);
    console.log('✅ Language set to user preferred language:', userLang);
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string | null): string {
    if (!code) return 'Unknown';
    const lang = this.languageStore.availableLanguages().find(l => l.code === code);
    return lang?.name || code.toUpperCase();
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
}
