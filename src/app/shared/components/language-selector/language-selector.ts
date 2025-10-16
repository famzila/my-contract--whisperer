/**
 * Language Selector Component
 * Beautiful dropdown for selecting user's preferred language
 */
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageStore } from '../../../core/stores/language.store';
import { ContractStore } from '../../../core/stores/contract.store';
import { Globe, ChevronDown, Check } from '../../icons/lucide-icons';

@Component({
  selector: 'app-language-selector',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './language-selector.html',
})
export class LanguageSelector {
  languageStore = inject(LanguageStore);
  contractStore = inject(ContractStore);
  translateService = inject(TranslateService);
  
  // Lucide icons
  readonly GlobeIcon = Globe;
  readonly ChevronDownIcon = ChevronDown;
  readonly CheckIcon = Check;
  
  // Local UI state
  isDropdownOpen = signal(false);
  
  // Computed values
  selectedLanguage = computed(() => this.languageStore.preferredLanguageInfo());
  availableLanguages = computed(() => this.languageStore.availableLanguages());
  
  /**
   * Toggle dropdown
   */
  toggleDropdown(): void {
    this.isDropdownOpen.update(val => !val);
  }
  
  /**
   * Select language
   */
  async selectLanguage(languageCode: string): Promise<void> {
    const previousLanguage = this.languageStore.preferredLanguage();
    
    // Update app UI language
    this.languageStore.setPreferredLanguage(languageCode);
    this.isDropdownOpen.set(false);
    
    // If there's an active contract analysis, re-translate it to the new language
    const hasContract = this.contractStore.contract();
    const hasAnalysis = this.contractStore.canShowDashboard();
    
    if (hasContract && hasAnalysis && previousLanguage !== languageCode) {
      console.log(`🌍 [LanguageSelector] Language changed: ${previousLanguage} → ${languageCode}`);
      console.log(`🔄 [LanguageSelector] Re-translating analysis results...`);
      
      try {
        await this.contractStore.switchAnalysisLanguage(languageCode);
        console.log(`✅ [LanguageSelector] Analysis re-translated successfully`);
      } catch (error) {
        console.error(`❌ [LanguageSelector] Failed to re-translate analysis:`, error);
      }
    }
  }
  
  /**
   * Close dropdown when clicking outside
   */
  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
