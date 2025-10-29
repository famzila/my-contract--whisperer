import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link' | 'neutral';
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
  icon = input<LucideIconData | undefined>(undefined);
  iconPosition = input<'left' | 'right' | 'center'>('left');

  // Outputs
  clicked = output<Event>();

  // Computed properties
  hasIcon = computed(() => this.icon() !== undefined);
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
    const baseClasses = 'flex-shrink-0';
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
        return 'border-indigo-600 dark:border-indigo-400';
      case 'danger':
        return 'border-white';
      case 'ghost':
        return 'border-indigo-600 dark:border-indigo-400';
      case 'link':
        return 'border-indigo-600 dark:border-indigo-400';
      default:
        return 'border-white';
    }
  }

  /**
   * Get text classes based on size
   */
  getTextClasses(): string {
    return 'flex-shrink-0 leading-none';
  }

  /**
   * Get host CSS classes
   */
  hostClasses(): string {
    const classes = ['btn'];

    // Size
    switch (this.size()) {
      case 'sm':
        classes.push('btn-sm');
        break;
      case 'md':
        classes.push('btn-md');
        break;
      case 'lg':
        classes.push('btn-lg');
        break;
    }

    // Layout
    if (this.fullWidth()) {
      classes.push('btn-full-width');
    } else {
      classes.push('btn-inline');
    }

    // Variants
    switch (this.variant()) {
      case 'primary':
        classes.push('btn-primary');
        break;
      case 'secondary':
        classes.push('btn-secondary');
        break;
      case 'danger':
        classes.push('btn-danger');
        break;
      case 'ghost':
        classes.push('btn-ghost');
        break;
      case 'link':
        classes.push('btn-link');
        break;
      case 'neutral':
        classes.push('btn-neutral');
        break;
    }

    // Rounded
    switch (this.rounded()) {
      case 'sm':
        classes.push('btn-rounded-sm');
        break;
      case 'md':
        classes.push('btn-rounded-md');
        break;
      case 'lg':
        classes.push('btn-rounded-lg');
        break;
      case 'full':
        classes.push('btn-rounded-full');
        break;
    }

    // State
    if (this.disabled() || this.loading()) {
      classes.push('btn-disabled');
    } else {
      classes.push('btn-enabled');
    }

    if (this.selected()) classes.push('btn-selected');
    if (this.customClasses()) classes.push(this.customClasses());

    return classes.join(' ');
  }
}
