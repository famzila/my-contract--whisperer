import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  AlertTriangle, 
  FileX
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { ContractInsightCard } from "../../../../shared/components/contract-insight-card/contract-insight-card";

export interface RiskFlag {
  title: string;
  description: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  icon?: string;
}

@Component({
  selector: 'app-risks-tab',
  imports: [TranslatePipe, LucideAngularModule, SkeletonLoader, Notice, TabHeader, ContractInsightCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './risks-tab.component.html'
})
export class RisksTabComponent {
  // Modern input signals
  risks = input<RiskFlag[]>([]);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  highRisks = input<RiskFlag[]>([]);
  mediumRisks = input<RiskFlag[]>([]);
  lowRisks = input<RiskFlag[]>([]);

  // Icons
  AlertTriangleIcon = AlertTriangle;
  FileXIcon = FileX;
}

