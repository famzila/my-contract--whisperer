import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  AlertTriangle, 
  Info, 
  Lightbulb,
  FileX
} from '../../../../shared/icons/lucide-icons';
import { Alert } from "../../../../shared/components/alert/alert";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";

export interface RiskFlag {
  title: string;
  description: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  icon?: string;
}

@Component({
  selector: 'app-risks-tab',
  imports: [TranslatePipe, LucideAngularModule, SkeletonLoader, Alert, TabHeader],
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
  InfoIcon = Info;
  LightbulbIcon = Lightbulb;
  FileXIcon = FileX;
}

