import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  templateUrl: './loading-spinner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinner {
  size = input<SpinnerSize>('md');
  message = input<string>('');
  colorClass = input<string>('border-primary');

  /**
   * Get spinner size classes
   */
  getSizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'h-5 w-5 border-2';
      case 'md':
        return 'h-8 w-8 border-3';
      case 'lg':
        return 'h-12 w-12 border-4';
      case 'xl':
        return 'h-16 w-16 border-4';
      default:
        return 'h-8 w-8 border-3';
    }
  }

  /**
   * Get spinner color class
   */
  getColorClass(): string {
    return this.colorClass();
  }
}
