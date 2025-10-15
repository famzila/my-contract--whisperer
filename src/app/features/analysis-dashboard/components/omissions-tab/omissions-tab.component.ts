import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  FileX, 
  AlertTriangle, 
  Info 
} from '../../../../shared/icons/lucide-icons';

export interface Omission {
  item: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-omissions-tab',
  imports: [TranslateModule, LucideAngularModule, Card, SkeletonLoader],
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
  AlertTriangleIcon = AlertTriangle;
  InfoIcon = Info;
}

