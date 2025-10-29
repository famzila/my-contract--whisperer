import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import {
  Globe,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  CircleCheckBig,
  Info,
  Languages,
} from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

export interface LanguageMismatchData {
  detectedLanguage: string;
  preferredLanguage: string;
  isContractLanguageSupported: boolean;

  // NEW: Language support information
  isContractLanguageAvailableInUI: boolean; // Is contract language available in app UI?
  canAnalyzeDirectly: boolean; // Can Gemini Nano analyze this language directly?
  needsPreTranslation: boolean; // Needs translation before analysis?
  fallbackLanguage: string; // Fallback language if contract language not available in UI

  // NEW: Cached translations
  availableLanguages: string[]; // Languages available in cache (including original)

  onSelectContractLanguage: () => void;
  onSelectUserLanguage: () => void;
  onSelectCachedLanguage: (languageCode: string) => void;
  getLanguageName: (code: string) => string;
  getLanguageFlag: (code: string) => string;
}

@Component({
  selector: 'app-language-mismatch-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Notice],
  template: `
    <app-base-modal [config]="modalConfig">
      <!-- Header Description -->
      <app-notice
        type="info"
        [icon]="LanguagesIcon"
        titleKey="language.mismatchDetected"
        message="{{ 'language.mismatchMessage' | translate }} <strong>{{
          getLanguageName(data.detectedLanguage)
        }}</strong> {{ 'language.appLanguageSet' | translate }} <strong>{{
          getLanguageName(data.preferredLanguage)
        }}</strong>"
      >
      </app-notice>

      <div class="space-y-3 mb-3">
        <p class="font-medium mb-3 text-secondary">
          {{ 'language.whichLanguage' | translate }}
        </p>

        <!-- Contract Language Option -->
        <button
          type="button"
          (click)="onSelectContractLanguage()"
          class="w-full flex items-start justify-between p-4 text-left rtl:text-right card-surface rounded-xl hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 rtl:flex-row-reverse rtl:justify-end">
              <span class="text-2xl">{{ getLanguageFlag(data.detectedLanguage) }}</span>
              <div class="font-semibold">
                {{ getLanguageName(data.detectedLanguage) }}
              </div>
            </div>
            <div class="text-body-sm mb-2">
              {{ 'language.originalLanguage' | translate }}
            </div>

            <!-- Show different badges based on language support -->
            @if (data.isContractLanguageAvailableInUI && data.canAnalyzeDirectly) {
            <!-- Best case: Direct analysis + UI available -->
            <div class="badge badge-blue">
              <lucide-icon [img]="CheckIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
              <span>{{ 'language.appWillSwitch' | translate }}</span>
            </div>
            } @else if (data.isContractLanguageAvailableInUI && !data.canAnalyzeDirectly) {
            <!-- UI available but needs pre-translation -->
            @if (data.needsPreTranslation) {
            <app-notice
              type="warning"
              [icon]="AlertTriangleIcon"
              class="mb-4"
              titleKey="language.limitedSupport"
              messageKey="language.willTranslateForAnalysis"
            >
            </app-notice>
            }
            <app-notice type="info" [icon]="LanguagesIcon" titleKey="language.appWillSwitchWithTranslation">
            </app-notice>
            <!-- Warning for unsupported contract languages (needs pre-translation) -->
            } @else {
            <!-- UI not available - fallback to English -->
            <div class="badge badge-amber rtl:flex-row-reverse">
              <lucide-icon [img]="AlertCircleIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
              <span>{{
                'language.uiNotAvailable'
                  | translate
                    : {
                        language: getLanguageName(data.detectedLanguage),
                        fallback: getLanguageName(data.fallbackLanguage)
                      }
              }}</span>
            </div>
            }
          </div>
        </button>

        <!-- User Preferred Language Option -->
        <button
          type="button"
          (click)="onSelectUserLanguage()"
          class="w-full flex items-start justify-between p-4 text-left rtl:text-right card-surface rounded-xl hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 rtl:flex-row-reverse rtl:justify-end">
              <span class="text-2xl">{{ getLanguageFlag(data.preferredLanguage) }}</span>
              <div class="font-semibold">
                {{ getLanguageName(data.preferredLanguage) }}
              </div>
            </div>
            <div class="text-body-sm mb-2">
              {{ 'language.preferredLanguage' | translate }}
            </div>
          </div>
        </button>
      </div>

      <!-- Cached Languages Section -->
      @if (data.availableLanguages && data.availableLanguages.length > 0) {
      <div class="mt-6">
        <h3 class="text-sm font-semibold text-secondary mb-3 flex items-center gap-2">
          <lucide-icon [img]="LanguagesIcon" class="w-4 h-4"></lucide-icon>
          {{ 'language.availableTranslations' | translate }}
        </h3>
        <div class="space-y-2">
          @for (lang of data.availableLanguages; track lang) {
          <button
            type="button"
            (click)="onSelectCachedLanguage(lang)"
            class="w-full flex items-center justify-between p-3 text-left rtl:text-right surface-muted rounded-lg hover:border-primary hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
          >
            <div class="flex items-center gap-3">
              <span class="text-xl">{{ getLanguageFlag(lang) }}</span>
              <span class="font-medium">{{ getLanguageName(lang) }}</span>
            </div>
            <div class="badge badge-blue text-xs">
              <lucide-icon [img]="CheckIcon" class="w-3 h-3"></lucide-icon>
              <span>{{ 'language.cached' | translate }}</span>
            </div>
          </button>
          }
        </div>
      </div>
      }

      
    </app-base-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageMismatchModal {
  private dialogRef = inject(DialogRef);
  data = inject<LanguageMismatchData>(DIALOG_DATA);

  // Icons
  readonly LanguagesIcon = Languages;
  readonly LightbulbIcon = Lightbulb;
  readonly InfoIcon = Info;
  readonly AlertCircleIcon = AlertCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly CheckIcon = CircleCheckBig;

  // Modal configuration
  modalConfig: BaseModalConfig = {
    titleKey: 'language.mismatchDetected',
    icon: this.LanguagesIcon,
    showFooter: false,
  };

  /**
   * Get language name
   */
  getLanguageName(code: string): string {
    return this.data.getLanguageName(code);
  }

  /**
   * Get language flag
   */
  getLanguageFlag(code: string): string {
    return this.data.getLanguageFlag(code);
  }

  /**
   * Handle contract language selection
   */
  onSelectContractLanguage(): void {
    this.data.onSelectContractLanguage();
    this.dialogRef.close();
  }

  /**
   * Handle user language selection
   */
  onSelectUserLanguage(): void {
    this.data.onSelectUserLanguage();
    this.dialogRef.close();
  }

  /**
   * Handle cached language selection
   */
  onSelectCachedLanguage(languageCode: string): void {
    this.data.onSelectCachedLanguage(languageCode);
    this.dialogRef.close();
  }
}
