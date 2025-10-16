import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Button } from '../../../../shared/components/button/button';
import { 
  Theater, 
  Globe, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  Calendar,
  Users
} from '../../../../shared/icons/lucide-icons';
import type { ContractMetadata } from '../../../../core/schemas/analysis-schemas';

export interface PerspectiveBadge {
  icon: any;
  text: string;
  className: string;
}

@Component({
  selector: 'app-dashboard-header',
  imports: [CommonModule, TranslateModule, LucideAngularModule, Button, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-header.component.html'
})
export class DashboardHeaderComponent {
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
  AlertTriangleIcon = AlertTriangle;
  CalendarIcon = Calendar;
  UsersIcon = Users;

  // Computed signals
  hasContractText = computed(() => !!this.metadata());

  isContractExpiringSoon(): boolean {
    const metadata = this.metadata();
    if (!metadata?.endDate) return false;
    
    const endDate = new Date(metadata.endDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  }

}
