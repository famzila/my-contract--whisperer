import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { StructuredObligation } from '../../../../core/models/ai-analysis.model';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  RefreshCw, 
  Clipboard 
} from '../../../../shared/icons/lucide-icons';

export interface Obligation {
  duty: string;
  amount?: number;
  frequency?: string;
  startDate?: string;
  duration?: string;
  scope?: string;
}

export interface ObligationsData {
  employer: StructuredObligation[];
  employee: StructuredObligation[];
}

@Component({
  selector: 'app-obligations-tab',
  imports: [TranslateModule, LucideAngularModule, Card, SkeletonLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './obligations-tab.component.html'
})
export class ObligationsTabComponent {
  // Modern input signals
  obligations = input<ObligationsData | null>(null);
  isLoading = input<boolean>(false);

  // Icons
  ClockIcon = Clock;
  CheckCircleIcon = CheckCircle;
  AlertTriangleIcon = AlertTriangle;
  DollarSignIcon = DollarSign;
  RefreshCwIcon = RefreshCw;
  ClipboardIcon = Clipboard;
}
