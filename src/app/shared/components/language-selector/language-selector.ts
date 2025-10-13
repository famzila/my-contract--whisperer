/**
 * Language Selector Component
 * Beautiful dropdown for selecting user's preferred language
 */
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { LanguageStore } from '../../../core/stores/language.store';
import { Globe, ChevronDown, Check } from '../../icons/lucide-icons';

@Component({
  selector: 'app-language-selector',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './language-selector.html',
})
export class LanguageSelector {
  languageStore = inject(LanguageStore);
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
  selectLanguage(languageCode: string): void {
    this.languageStore.setPreferredLanguage(languageCode);
    this.isDropdownOpen.set(false);
  }
  
  /**
   * Close dropdown when clicking outside
   */
  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
