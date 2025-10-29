import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import {  TriangleAlert, 
  FileX
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { ContractInsightCard } from "../../../../shared/components/contract-insight-card/contract-insight-card";

import type { RiskItem } from '../../../../core/schemas/analysis-schemas';

@Component({
  selector: 'app-risks-tab',
  imports: [TranslatePipe, LucideAngularModule, SkeletonLoader, Notice, TabHeader, ContractInsightCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './risks-tab.component.html'
})
export class RisksTabComponent {
  // Modern input signals
  risks = input<RiskItem[]>([]);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  highRisks = input<RiskItem[]>([]);
  mediumRisks = input<RiskItem[]>([]);
  lowRisks = input<RiskItem[]>([]);

  // Icons
  TriangleAlertIcon = TriangleAlert;
  FileXIcon = FileX;
}

