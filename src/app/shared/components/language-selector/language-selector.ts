/**
 * Language Selector Component
 * Beautiful dropdown for selecting user's preferred language
 */
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Languages, LucideAngularModule } from 'lucide-angular';
import { LanguageStore } from '../../../core/stores/language.store';
import { ContractStore } from '../../../core/stores/contract.store';
import { LoggerService } from '../../../core/services/logger.service';
import { getLanguageName } from '../../../core/utils/language.util';
import { Globe, ChevronDown, Check } from '../../icons/lucide-icons';

@Component({
  selector: 'app-language-selector',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './language-selector.html',
  styleUrl: './language-selector.css',
})
export class LanguageSelector {
  languageStore = inject(LanguageStore);
  contractStore = inject(ContractStore);
  translateService = inject(TranslateService);
  logger = inject(LoggerService);
  
  // Lucide icons
  readonly GlobeIcon = Globe;
  readonly LanguagesIcon = Languages;
  readonly ChevronDownIcon = ChevronDown;
  readonly CheckIcon = Check;
  
  // Local UI state
  isDropdownOpen = signal(false);
  
  // Computed values
  selectedLanguage = computed(() => this.languageStore.preferredLanguageInfo());
  availableLanguages = computed(() => this.languageStore.availableLanguages());
  
  // Current language code for display
  currentLanguage = computed(() => this.languageStore.preferredLanguage());
  
  // Disable language selector during analysis/translation

  isDisabled = computed(() => {
    const hasContract = this.contractStore.hasContract();
    const isUploading = this.contractStore.isUploading();
    const isAnalyzing = this.contractStore.isAnalyzing();
    const isDone = this.contractStore.isDone();
    const isTranslating = this.contractStore.isTranslating();
    
    // Check if any processing is happening (upload, analyze, translate)
    const isProcessing = isUploading || isAnalyzing || isTranslating;
    
    // If no contract AND no processing, enable (clean upload page)
    if (!hasContract && !isProcessing) {
      return false;
    }
    
    // If any processing is happening, disable
    if (isProcessing) {
      return true;
    }
    
    // If contract exists but not processing, check if analysis is done
    if (hasContract && !isProcessing) {
      const shouldDisable = !isDone;
      return shouldDisable;
    }
    
    // Default: enable
    return false;
  });
  
  /**
   * Toggle dropdown
   */
  toggleDropdown(): void {
    this.isDropdownOpen.update(val => !val);
  }
  
  /**
   * Select language - now uses consolidated store method with optimistic updates
   */
  async selectLanguage(languageCode: string): Promise<void> {
    const hasContract = this.contractStore.contract();
    const hasAnalysis = this.contractStore.canShowDashboard();
    
    // Use the consolidated store method with optimistic updates and error handling
    const result = await this.languageStore.switchLanguage(
      languageCode, 
      !!hasContract, 
      !!hasAnalysis, 
      this.contractStore
    );
    
    if (result.success) {
      // Close dropdown on success
      this.isDropdownOpen.set(false);
      this.logger.info(`✅ [LanguageSelector] Language switched successfully to ${languageCode}`);
    } else {
      // Handle error with user-friendly message
      this.logger.error(`❌ [LanguageSelector] Language switch failed:`, result.error);
      
      // Show improved, transparent error message with friendly language names
      const targetLanguageName = getLanguageName(languageCode);
      const currentLanguageName = getLanguageName(result.revertedTo || this.languageStore.preferredLanguage());
      
      // Build comprehensive error message using translations
      const errorMessage = this.translateService.instant('errors.languageSwitchFailed', {
        targetLanguage: targetLanguageName,
        currentLanguage: currentLanguageName
      });
      
      const explanation = this.translateService.instant('errors.languageSwitchExplanation', {
        targetLanguage: targetLanguageName
      });
      
      const retryMessage = this.translateService.instant('errors.languageSwitchRetry', {
        targetLanguage: targetLanguageName
      });
      
      // Show comprehensive error message
      alert(`${errorMessage}\n\n${explanation}\n\n${retryMessage}`);
    }
  }
  
  /**
   * Close dropdown when clicking outside
   */
  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
