/**
 * Language Banner Component
 * Shows when contract language differs from user's preferred language
 */
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageStore } from '../../../core/stores/language.store';

@Component({
  selector: 'app-language-banner',
  imports: [CommonModule],
  templateUrl: './language-banner.html',
  styleUrl: './language-banner.css',
})
export class LanguageBanner {
  languageStore = inject(LanguageStore);
  
  // Computed values
  showBanner = computed(() => this.languageStore.showLanguageBanner());
  detectedLanguage = computed(() => this.languageStore.detectedLanguageInfo());
  preferredLanguage = computed(() => this.languageStore.preferredLanguageInfo());
  availableLanguages = computed(() => 
    this.languageStore.availableLanguages().filter(
      lang => lang.code !== this.languageStore.detectedContractLanguage()
    )
  );
  
  /**
   * Quick select language
   */
  selectLanguage(languageCode: string): void {
    this.languageStore.setPreferredLanguage(languageCode);
  }
  
  /**
   * Dismiss banner
   */
  dismiss(): void {
    this.languageStore.dismissLanguageBanner();
  }
}
