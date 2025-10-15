import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class Button {
  // Inputs
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input<boolean>(false);
  loading = input<boolean>(false);
  fullWidth = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  // Outputs
  clicked = output<Event>();

  /**
   * Handle click event
   */
  onClick(event: Event): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }

  /**
   * Get host CSS classes
   */
  hostClasses(): string {
    const classes = ['inline-flex', 'items-center', 'justify-center', 'font-medium', 'transition-all', 'rounded-lg'];

    // Variant styles
    switch (this.variant()) {
      case 'primary':
        classes.push('bg-primary', 'text-white', 'hover:bg-primary-dark');
        break;
      case 'secondary':
        classes.push('bg-gray-200', 'text-gray-900', 'hover:bg-gray-300');
        break;
      case 'danger':
        classes.push('bg-error', 'text-white', 'hover:bg-red-700');
        break;
      case 'ghost':
        classes.push('bg-transparent', 'text-gray-700', 'hover:bg-gray-100');
        break;
    }

    // Size styles
    switch (this.size()) {
      case 'sm':
        classes.push('px-3', 'py-1.5', 'text-sm');
        break;
      case 'md':
        classes.push('px-4', 'py-2', 'text-base');
        break;
      case 'lg':
        classes.push('px-6', 'py-3', 'text-lg');
        break;
    }

    // State styles
    if (this.disabled() || this.loading()) {
      classes.push('opacity-50', 'cursor-not-allowed');
    } else {
      classes.push('cursor-pointer');
    }

    if (this.fullWidth()) {
      classes.push('w-full');
    }

    return classes.join(' ');
  }
}
