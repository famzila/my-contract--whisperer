import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  Languages
} from '../../icons/lucide-icons';

export interface LanguageMismatchData {
  detectedLanguage: string;
  preferredLanguage: string;
  isContractLanguageSupported: boolean;
  
  // NEW: Language support information
  isContractLanguageAvailableInUI: boolean;  // Is contract language available in app UI?
  canAnalyzeDirectly: boolean;  // Can Gemini Nano analyze this language directly?
  needsPreTranslation: boolean;  // Needs translation before analysis?
  fallbackLanguage: string;  // Fallback language if contract language not available in UI
  
  onSelectContractLanguage: () => void;
  onSelectUserLanguage: () => void;
  getLanguageName: (code: string) => string;
  getLanguageFlag: (code: string) => string;
}

@Component({
  selector: 'app-language-mismatch-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe, BaseModal],
  template: `
    <app-base-modal [config]="modalConfig">
      <!-- Header Description -->
      <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center gap-2 mb-2 rtl:flex-row-reverse">
          <lucide-icon [img]="GlobeIcon" class="w-5 h-5 text-blue-600"></lucide-icon>
          <h3 class="font-semibold text-blue-800">{{ 'language.mismatchDetected' | translate }}</h3>
        </div>
        <p class="text-sm text-blue-700">
          {{ 'language.mismatchMessage' | translate }} <strong>{{ getLanguageName(data.detectedLanguage) }}</strong>
          {{ 'language.appLanguageSet' | translate }} <strong>{{ getLanguageName(data.preferredLanguage) }}</strong>.
        </p>
      </div>

      <!-- Warning for unsupported contract languages (needs pre-translation) -->
      @if (data.needsPreTranslation) {
        <div class="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <div class="flex items-start gap-3">
            <lucide-icon [img]="AlertTriangleIcon" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></lucide-icon>
            <div>
              <p class="text-sm font-medium text-amber-900 mb-1">
                {{ 'language.limitedSupport' | translate }}
              </p>
              <p class="text-xs text-amber-700">
                {{ 'language.willTranslateForAnalysis' | translate }}
              </p>
            </div>
          </div>
        </div>
      }

      <div class="space-y-3">
        <p class="font-medium mb-3">
          {{ 'language.whichLanguage' | translate }}
        </p>

        <!-- Contract Language Option -->
        <button
          type="button"
          (click)="onSelectContractLanguage()"
          class="w-full flex items-start justify-between p-4 text-left rtl:text-right bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 rtl:flex-row-reverse rtl:justify-end">
              <span class="text-2xl">{{ getLanguageFlag(data.detectedLanguage) }}</span>
              <div class="font-semibold">
                {{ getLanguageName(data.detectedLanguage) }}
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-2">
              {{ 'language.originalLanguage' | translate }}
            </div>

            <!-- Show different badges based on language support -->
            @if (data.isContractLanguageAvailableInUI && data.canAnalyzeDirectly) {
              <!-- Best case: Direct analysis + UI available -->
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 rtl:flex-row-reverse">
                <lucide-icon [img]="CheckIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
                <span>{{ 'language.appWillSwitch' | translate }}</span>
              </div>
            } @else if (data.isContractLanguageAvailableInUI && !data.canAnalyzeDirectly) {
              <!-- UI available but needs pre-translation -->
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 rtl:flex-row-reverse">
                <lucide-icon [img]="LanguagesIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
                <span>{{ 'language.appWillSwitchWithTranslation' | translate }}</span>
              </div>
            } @else {
              <!-- UI not available - fallback to English -->
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-200 rtl:flex-row-reverse">
                <lucide-icon [img]="AlertCircleIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
                <span>{{ 'language.uiNotAvailable' | translate: { language: getLanguageName(data.detectedLanguage), fallback: getLanguageName(data.fallbackLanguage) } }}</span>
              </div>
            }
          </div>
        </button>

        <!-- User Preferred Language Option -->
        <button
          type="button"
          (click)="onSelectUserLanguage()"
          class="w-full flex items-start justify-between p-4 text-left rtl:text-right bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 rtl:flex-row-reverse rtl:justify-end">
              <span class="text-2xl">{{ getLanguageFlag(data.preferredLanguage) }}</span>
              <div class="font-semibold">
                {{ getLanguageName(data.preferredLanguage) }}
              </div>
            </div>
            <div class="text-sm text-gray-600 mb-2">
              {{ 'language.preferredLanguage' | translate }}
            </div>

            <!-- Success Badge -->
            <div class="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 rtl:flex-row-reverse">
              <lucide-icon [img]="CheckIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
              <span>{{ 'language.noAppSwitch' | translate }}</span>
            </div>
          </div>
        </button>
      </div>

      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="flex items-start gap-2 rtl:flex-row-reverse">
          <lucide-icon [img]="LightbulbIcon" class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></lucide-icon>
          <span class="rtl:text-right"><strong>{{ 'language.tipTitle' | translate }}</strong> {{ 'language.tipMessage' | translate }}</span>
        </p>
      </div>
    </app-base-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageMismatchModal {
  private dialogRef = inject(DialogRef);
  data = inject<LanguageMismatchData>(DIALOG_DATA);

  // Icons
  readonly GlobeIcon = Globe;
  readonly LightbulbIcon = Lightbulb;
  readonly InfoIcon = Info;
  readonly AlertCircleIcon = AlertCircle;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly CheckIcon = CircleCheckBig;
  readonly LanguagesIcon = Languages;

  // Modal configuration
  modalConfig: BaseModalConfig = {
    titleKey: 'language.mismatchDetected',
    icon: Globe,
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
}
