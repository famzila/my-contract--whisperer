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
  CircleCheckBig,
  Info
} from '../../icons/lucide-icons';

export interface LanguageMismatchData {
  detectedLanguage: string;
  preferredLanguage: string;
  isContractLanguageSupported: boolean;
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

            <!-- Warning Badge -->
            @if (data.isContractLanguageSupported) {
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-lg border border-blue-200 rtl:flex-row-reverse">
                <lucide-icon [img]="InfoIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
                <span>{{ 'language.appWillSwitch' | translate }}</span>
              </div>
            } @else {
              <div class="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 text-sm rounded-lg border border-yellow-200 rtl:flex-row-reverse">
                <lucide-icon [img]="AlertCircleIcon" class="w-4 h-4 flex-shrink-0"></lucide-icon>
                <span>{{ 'language.appWillStayInCurrent' | translate }}</span>
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
  readonly CheckIcon = CircleCheckBig;

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
