import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export type SeverityVariant = 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'custom';

@Component({
  selector: 'app-severity-badge',
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './severity-badge.html'
})
export class SeverityBadge {
  // Input signals
  label = input.required<string>();
  variant = input<SeverityVariant>('info');
  icon = input<LucideIconData | null>(null);
  customClasses = input<string>('');

  // Computed classes for variant styling
  variantClasses = computed(() => {
    const variantMap: Record<SeverityVariant, string> = {
      critical: 'severity-badge-critical',
      warning: 'severity-badge-warning',
      info: 'severity-badge-info',
      success: 'severity-badge-success',
      neutral: 'severity-badge-neutral',
      custom: ''
    };
    return variantMap[this.variant()];
  });

  // Combined classes
  badgeClasses = computed(() => {
    const base = 'severity-badge';
    const variant = this.variantClasses();
    const custom = this.customClasses();
    return [base, variant, custom].filter(Boolean).join(' ');
  });
}

