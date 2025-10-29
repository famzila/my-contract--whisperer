import { Component, input, output, computed, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule, Upload } from 'lucide-angular';
import { Button } from '../../../../shared/components/button/button';
import { SeverityBadge } from '../../../../shared/components/severity-badge/severity-badge';
import { LanguageStore } from '../../../../core/stores/language.store';
import { getRoleTranslationKey } from '../../../../core/utils/role.util';
import { 
  Theater, 
  Globe, 
  RefreshCw, 
  FileText, 
  TriangleAlert, 
  Calendar,
  Users,
  Info
} from '../../../../shared/icons/lucide-icons';
import type { ContractMetadata } from '../../../../core/schemas/analysis-schemas';

export interface PerspectiveBadge {
  icon: any;
  text: string;
  className: string;
}

@Component({
  selector: 'app-dashboard-header',
  imports: [CommonModule, TranslateModule, LucideAngularModule, Button, SeverityBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-header.component.html'
})
export class DashboardHeaderComponent {
  private languageStore = inject(LanguageStore);
  private translate = inject(TranslateService);

  // Modern input signals
  metadata = input<ContractMetadata | null>(null);
  isMockMode = input<boolean>(false);
  perspectiveBadge = input<PerspectiveBadge | null>(null);
  wasTranslated = input<boolean>(false);
  sourceLanguageName = input<string>('');
  todayDate = input<Date>(new Date());
  showingOriginal = input<boolean>(false);

  // Modern output signals
  uploadNew = output<void>();
  toggleOriginal = output<void>();

  // Icons (imported from lucide-icons)
  TheaterIcon = Theater;
  GlobeIcon = Globe;
  RefreshCwIcon = RefreshCw;
  FileTextIcon = FileText;
  TriangleAlertIcon = TriangleAlert;
  CalendarIcon = Calendar;
  UsersIcon = Users;
  InfoIcon = Info;
  UploadIcon = Upload;

  // Computed signals
  hasContractText = computed(() => !!this.metadata());

  // Format date based on app language, not browser locale
  formattedDate = computed(() => {
    const date = this.todayDate();
    const language = this.languageStore.preferredLanguage();
    
    // Map app language to proper locale for date formatting
    const localeMap: Record<string, string> = {
      'en': 'en-US',    // MM/DD/YYYY
      'fr': 'fr-FR',    // DD/MM/YYYY
      'ar': 'ar-SA',    // DD/MM/YYYY
      'es': 'es-ES',    // DD/MM/YYYY
      'de': 'de-DE',    // DD.MM.YYYY
      'ja': 'ja-JP',    // YYYY/MM/DD
      'zh': 'zh-CN',    // YYYY年MM月DD日
      'ko': 'ko-KR'     // YYYY. MM. DD.
    };

    const locale = localeMap[language] || 'en-US';
    
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  });

  isContractExpiringSoon(): boolean {
    const metadata = this.metadata();
    if (!metadata?.endDate) return false;
    
    const endDate = new Date(metadata.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

  /**
   * Translate role name to current language
   */
  translateRole(role: string): string {
    const translationKey = getRoleTranslationKey(role);
    
    if (translationKey && translationKey !== role) {
      return this.translate.instant(translationKey);
    }
    
    return role; // Return original if not found
  }

}
