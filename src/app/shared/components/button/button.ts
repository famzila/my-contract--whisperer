import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonRounded = 'sm' | 'md' | 'lg' | 'full';

@Component({
  selector: 'app-button',
  imports: [LucideAngularModule, LoadingSpinner],
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
  iconOnly = input<boolean>(false);
  selected = input<boolean>(false);
  rounded = input<ButtonRounded>('lg');
  customClasses = input<string>('');

  // Structured content inputs
  text = input<string>('');
  loadingText = input<string>('');
  icon = input<any>(null); // Lucide icon component
  iconPosition = input<'left' | 'right' | 'center'>('left');

  // Outputs
  clicked = output<Event>();

  // Computed properties
  hasIcon = computed(() => this.icon() !== null);
  hasContent = computed(() => this.text() || this.hasIcon());

  /**
   * Handle click event
   */
  onClick(event: Event): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit(event);
    }
  }

  /**
   * Get icon classes based on size
   */
  getIconClasses(): string {
    const baseClasses = 'flex-shrink-0 inline-block';
    switch (this.size()) {
      case 'sm':
        return `${baseClasses} w-4 h-4`;
      case 'md':
        return `${baseClasses} w-4 h-4`;
      case 'lg':
        return `${baseClasses} w-5 h-5`;
      default:
        return `${baseClasses} w-4 h-4`;
    }
  }

  /**
   * Get text classes based on size
   */
  getTextClasses(): string {
    return 'flex-shrink-0 inline-block leading-none';
  }

  /**
   * Get spinner size based on button size
   */
  getSpinnerSize(): 'sm' | 'md' | 'lg' {
    switch (this.size()) {
      case 'sm':
        return 'sm';
      case 'md':
        return 'sm';
      case 'lg':
        return 'md';
      default:
        return 'sm';
    }
  }

  /**
   * Get spinner color based on variant
   */
  getSpinnerColor(): string {
    switch (this.variant()) {
      case 'primary':
        return 'border-white';
      case 'secondary':
        return 'border-primary';
      case 'danger':
        return 'border-white';
      case 'ghost':
        return 'border-primary';
      case 'link':
        return 'border-primary';
      default:
        return 'border-white';
    }
  }

  /**
   * Get host CSS classes
   */
  hostClasses(): string {
    const classes = ['transition-all', 'font-medium'];
  
    // Handle layout depending on fullWidth
    if (this.fullWidth()) {
      classes.push('block', 'w-full');
    } else {
      classes.push('inline-flex');
    }
  
    // Variants
    switch (this.variant()) {
      case 'primary':
        classes.push(
          'bg-primary', 'text-white', 'hover:bg-primary-dark',
          'border', 'border-primary', 'shadow-md', 'hover:shadow-lg',
          'duration-200', 'focus:outline-none', 'focus:ring-2',
          'focus:ring-primary', 'focus:ring-offset-2'
        );
        break;
      case 'secondary':
        classes.push('bg-primary-50', 'text-primary-900', 'hover:bg-primary-100', 'border', 'border-primary-200');
        break;
      case 'danger':
        classes.push('bg-red-600', 'text-white', 'hover:bg-red-700', 'border', 'border-red-600');
        break;
      case 'ghost':
        classes.push('bg-transparent', 'text-primary-700', 'hover:bg-primary-50');
        break;
      case 'link':
        classes.push('bg-transparent', 'text-primary', 'hover:text-primary-dark', 'hover:bg-primary-50', 'hover:border-primary-200');
        break;
    }
  
    // Rounded
    switch (this.rounded()) {
      case 'sm': classes.push('rounded'); break;
      case 'md': classes.push('rounded-md'); break;
      case 'lg': classes.push('rounded-lg'); break;
      case 'full': classes.push('rounded-full'); break;
    }
  
    if (this.disabled() || this.loading()) classes.push('opacity-50', 'cursor-not-allowed');
    else classes.push('cursor-pointer');
  
    if (this.selected()) classes.push('ring-2', 'ring-primary', 'ring-offset-2');
    if (this.customClasses()) classes.push(this.customClasses());
  
    return classes.join(' ');
  }
    
}
