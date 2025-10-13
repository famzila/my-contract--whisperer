import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { 
  Globe, 
  Lightbulb 
} from '../../icons/lucide-icons';

export interface LanguageMismatchData {
  detectedLanguage: string;
  preferredLanguage: string;
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
        <div class="flex items-center gap-2 mb-2">
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
          class="w-full flex items-center justify-between p-4 text-left rtl:text-right bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
        >
          <div class="flex-1">
            <div class="font-semibold">
              {{ getLanguageName(data.detectedLanguage) }}
            </div>
            <div>
              {{ 'language.originalLanguage' | translate }}
            </div>
          </div>
          <span class="text-2xl flex-shrink-0 rtl:ml-0 rtl:mr-4 ltr:ml-4">{{ getLanguageFlag(data.detectedLanguage) }}</span>
        </button>
        
        <!-- User Preferred Language Option -->
        <button
          type="button"
          (click)="onSelectUserLanguage()"
          class="w-full flex items-center justify-between p-4 text-left rtl:text-right bg-white border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-blue-50 transition-all"
        >
          <div class="flex-1">
            <div class="font-semibold">
              {{ getLanguageName(data.preferredLanguage) }}
            </div>
            <div>
              {{ 'language.preferredLanguage' | translate }}
            </div>
          </div>
          <span class="text-2xl flex-shrink-0 rtl:ml-0 rtl:mr-4 ltr:ml-4">{{ getLanguageFlag(data.preferredLanguage) }}</span>
        </button>
      </div>
      
      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p class="flex items-start gap-2">
          <lucide-icon [img]="LightbulbIcon" class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"></lucide-icon>
          <span><strong>{{ 'language.tipTitle' | translate }}</strong> {{ 'language.tipMessage' | translate }}</span>
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
