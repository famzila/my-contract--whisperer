import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, InfoIcon, AlertTriangleIcon, AlertCircleIcon } from 'lucide-angular';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

type AlertType = 'info' | 'warning' | 'error' | 'loading';

@Component({
  selector: 'app-alert',
  imports: [LucideAngularModule, LoadingSpinner],
  templateUrl: './alert.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alert {
  // Inputs
  type = input<AlertType>('info');
  title = input<string | null>(null);
  message = input<string | null>(null);
  showIcon = input(true);

  // Computed properties for dynamic classes and icons
  icon = computed(() => {
    switch (this.type()) {
      case 'info':
        return InfoIcon;
      case 'warning':
        return AlertTriangleIcon;
      case 'error':
        return AlertCircleIcon;
      default:
        return InfoIcon;
    }
  });

  iconColorClass = computed(() => {
    switch (this.type()) {
      case 'info':
        return 'text-blue-600';
      case 'warning':
      case 'loading':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
    }
  });

  containerClass = computed(() => {
    switch (this.type()) {
      case 'info':
        return 'bg-blue-50/80 border-blue-500 shadow-sm';
      case 'warning':
      case 'loading':
        return 'bg-yellow-50/80 border-yellow-500 shadow-sm';
      case 'error':
        return 'bg-red-50/80 border-red-500 shadow-sm';
    }
  });

  titleClass = computed(() => {
    switch (this.type()) {
      case 'info':
        return 'text-blue-900';
      case 'warning':
      case 'loading':
        return 'text-yellow-900';
      case 'error':
        return 'text-red-900';
    }
  });

  messageClass = computed(() => {
    switch (this.type()) {
      case 'info':
        return 'text-blue-800';
      case 'warning':
      case 'loading':
        return 'text-yellow-800';
      case 'error':
        return 'text-red-800';
    }
  });

  /**
   * Get spinner color class that matches the alert type
   */
  getSpinnerColorClass(): string {
    switch (this.type()) {
      case 'info':
        return 'border-blue-600';
      case 'warning':
      case 'loading':
        return 'border-yellow-600';
      case 'error':
        return 'border-red-600';
      default:
        return 'border-blue-600';
    }
  }
}