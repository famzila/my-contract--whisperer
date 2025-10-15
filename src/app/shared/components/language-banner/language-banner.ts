/**
 * Language Banner Component
 * Shows when contract language differs from user's preferred language
 */
import { Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Globe, FileText, X } from '../../icons/lucide-icons';
import { LanguageStore } from '../../../core/stores/language.store';

@Component({
  selector: 'app-language-banner',
  imports: [TranslatePipe, LucideAngularModule],
  templateUrl: './language-banner.html',
})
export class LanguageBanner {
  languageStore = inject(LanguageStore);
  
  // Lucide icons
  readonly GlobeIcon = Globe;
  readonly FileTextIcon = FileText;
  readonly XIcon = X;
  
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
