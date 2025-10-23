/**
 * Language Selector Component
 * Beautiful dropdown for selecting user's preferred language
 */
import { Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Languages, LucideAngularModule } from 'lucide-angular';
import { LanguageStore } from '../../../core/stores/language.store';
import { ContractStore } from '../../../core/stores/contract.store';
import { TranslatorService } from '../../../core/services/ai/translator.service';
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
  translatorService = inject(TranslatorService);
  
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
   * Select language
   */
  async selectLanguage(languageCode: string): Promise<void> {
    const previousLanguage = this.languageStore.preferredLanguage();
    
    // If there's an active contract analysis, pre-download language pack if needed
    // This ensures we have a user gesture available for the Chrome Translator API
    const hasContract = this.contractStore.contract();
    const hasAnalysis = this.contractStore.canShowDashboard();
    
    if (hasContract && hasAnalysis && previousLanguage !== languageCode) {
      console.log(`🌍 [LanguageSelector] Language changed: ${previousLanguage} → ${languageCode}`);
      
      // Check if language pack needs download (only once per language, per browser)
      try {
        const capabilities = await this.translatorService.canTranslate(previousLanguage, languageCode);
        
        if (capabilities.available === 'downloadable') {
          console.log(`📥 [LanguageSelector] Pre-downloading language pack: ${previousLanguage}→${languageCode}...`);
          
          try {
            // Pre-download while user gesture is active
            await this.translatorService.createTranslator({
              sourceLanguage: previousLanguage,
              targetLanguage: languageCode
            });
            
            console.log(`✅ [LanguageSelector] Language pack downloaded and cached`);
          } catch (downloadError) {
            console.warn(`⚠️ [LanguageSelector] Language pack download failed:`, downloadError);
            
            // Show user-friendly message and ask to retry
            const retry = confirm(
              `Language pack for ${languageCode} needs to be downloaded. ` +
              `This may take a moment. Click OK to retry, or Cancel to continue without translation.`
            );
            
            if (retry) {
              try {
                await this.translatorService.createTranslator({
                  sourceLanguage: previousLanguage,
                  targetLanguage: languageCode
                });
                console.log(`✅ [LanguageSelector] Language pack downloaded on retry`);
              } catch (retryError) {
                console.error(`❌ [LanguageSelector] Retry failed:`, retryError);
                alert(`Failed to download language pack for ${languageCode}. Some features may not work.`);
              }
            }
          }
        } else if (capabilities.available === 'readily') {
          console.log(`⚡ [LanguageSelector] Language pack already cached: ${previousLanguage}→${languageCode}`);
        } else {
          console.log(`ℹ️ [LanguageSelector] Language pack status: ${capabilities.available}`);
        }
      } catch (error) {
        console.warn(`⚠️ [LanguageSelector] Failed to check/download language pack:`, error);
        // Continue anyway - translation will attempt to download if needed
      }
    }
    
    // If there's an active contract analysis, re-translate it to the new language
    if (hasContract && hasAnalysis && previousLanguage !== languageCode) {
      console.log(`🔄 [LanguageSelector] Re-translating analysis results...`);
      
      try {
        // Pass the previous language to the store so it can revert properly
        await this.contractStore.switchAnalysisLanguage(languageCode, previousLanguage);
        console.log(`✅ [LanguageSelector] Analysis re-translated successfully`);
        
        // Only update UI language after successful translation
        this.languageStore.setPreferredLanguage(languageCode);
        this.isDropdownOpen.set(false);
      } catch (error) {
        console.error(`❌ [LanguageSelector] Failed to re-translate analysis:`, error);
        
        // Store has already reverted to previous language
        // The language selector should automatically reflect the current language via computed signals
        const currentLanguage = this.languageStore.preferredLanguage();
        console.log(`🔄 [LanguageSelector] Store reverted to: ${currentLanguage}`);
        console.log(`🔄 [LanguageSelector] Language selector should now show: ${currentLanguage}`);
        
        // Show user-friendly error message
        alert(
          `Failed to translate to ${languageCode}. ` +
          `The app has been reverted to ${currentLanguage}. ` +
          `Please try again or check your internet connection if this is the first time using this language.`
        );
      }
    } else {
      // No analysis to translate, just update UI language
      this.languageStore.setPreferredLanguage(languageCode);
      this.isDropdownOpen.set(false);
    }
  }
  
  /**
   * Close dropdown when clicking outside
   */
  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }
}
