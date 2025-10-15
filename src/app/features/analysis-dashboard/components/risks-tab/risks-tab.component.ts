import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Card } from '../../../../shared/components/card/card';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader';
import { 
  AlertTriangle, 
  Info, 
  Lightbulb 
} from '../../../../shared/icons/lucide-icons';

export interface RiskFlag {
  title: string;
  description: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  icon?: string;
}

@Component({
  selector: 'app-risks-tab',
  imports: [TranslateModule, LucideAngularModule, Card, SkeletonLoader],
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

  // Helper method to get Lucide icon from string name
  getRiskLucideIcon(iconName: string): any {
    // This would map icon names to actual Lucide icons
    // For now, return a default icon
    return AlertTriangle;
  }
}

