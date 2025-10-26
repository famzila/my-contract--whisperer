import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { PerspectiveObligations } from '../../../../core/utils/obligation-mapper.util';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign, 
  RefreshCw, 
  Clipboard 
} from '../../../../shared/icons/lucide-icons';
import { Notice } from "../../../../shared/components/notice/notice";
import { TabHeader } from "../../../../shared/components/tab-header/tab-header";

@Component({
  selector: 'app-obligations-tab',
  imports: [TranslateModule, LucideAngularModule, SkeletonLoader, Notice, TabHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './obligations-tab.component.html'
})
export class ObligationsTabComponent {
  // Modern input signals
  obligations = input<PerspectiveObligations | null>(null);
  isLoading = input<boolean>(false);
  retryCount = input<number>(0);
  isRetrying = input<boolean>(false);

  // Icons
  ClockIcon = Clock;
  CheckCircleIcon = CheckCircle;
  AlertTriangleIcon = AlertTriangle;
  DollarSignIcon = DollarSign;
  RefreshCwIcon = RefreshCw;
  ClipboardIcon = Clipboard;
}
