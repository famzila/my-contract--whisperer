import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CdkAccordionItem } from '@angular/cdk/accordion';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { SeverityBadge } from '../severity-badge/severity-badge';
import { ChevronDown, AlertTriangle } from '../../icons/lucide-icons';

export type InsightSeverity = 'high' | 'medium' | 'low';

@Component({
  selector: 'app-contract-insight-card',
  imports: [CdkAccordionItem, SeverityBadge, LucideAngularModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contract-insight-card.html'
})
export class ContractInsightCard {
  // Input signals
  title = input.required<string>();
  description = input<string>('');
  severity = input.required<InsightSeverity>();
  impactLabel = input<string>('analysis.insights.whyThisMatters');
  impactText = input<string>('');
  expanded = input<boolean>(false);

  // Computed properties for styling based on severity
  severityBadgeVariant = computed(() => {
    const severityMap: Record<InsightSeverity, 'critical' | 'warning' | 'info'> = {
      high: 'critical',
      medium: 'warning',
      low: 'info'
    };
    return severityMap[this.severity()];
  });

  severityBadgeLabel = computed(() => {
    const severityMap: Record<InsightSeverity, string> = {
      high: 'analysis.severityBadge.critical',
      medium: 'analysis.severityBadge.warning',
      low: 'analysis.severityBadge.info'
    };
    return severityMap[this.severity()];
  });

  borderAccentClass = computed(() => {
    const classMap: Record<InsightSeverity, string> = {
      high: 'insight-card-border-critical',
      medium: 'insight-card-border-warning',
      low: 'insight-card-border-info'
    };
    return classMap[this.severity()];
  });

  // Icons
  readonly ChevronDownIcon = ChevronDown;
  readonly AlertTriangleIcon = AlertTriangle;
}

