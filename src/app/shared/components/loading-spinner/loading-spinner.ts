import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.html',
  styleUrl: './loading-spinner.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingSpinner {
  size = input<SpinnerSize>('md');
  message = input<string>('');
  color = input<string>('primary');

  /**
   * Get spinner size classes
   */
  getSizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'h-4 w-4 border-2';
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
   * Get color class
   */
  getColorClass(): string {
    switch (this.color()) {
      case 'primary':
        return 'border-primary';
      case 'white':
        return 'border-white';
      case 'gray':
        return 'border-gray-600';
      default:
        return 'border-primary';
    }
  }
}
