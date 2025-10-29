import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  FileX
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";
import { ContractInsightCard } from "../../../../shared/components/contract-insight-card/contract-insight-card";
import type { Omission } from '../../../../core/schemas/analysis-schemas';

@Component({
  selector: 'app-omissions-tab',
  imports: [TranslateModule, LucideAngularModule, SkeletonLoader, Notice, TabHeader, ContractInsightCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './omissions-tab.component.html'
})
export class OmissionsTabComponent {
  // Modern input signals
  omissions = input<Omission[]>([]);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);
  highPriorityOmissions = input<Omission[]>([]);
  mediumPriorityOmissions = input<Omission[]>([]);
  lowPriorityOmissions = input<Omission[]>([]);

  // Icons
  FileXIcon = FileX;
}

