import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-modal',
  imports: [TranslatePipe],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  // Inputs
  isOpen = input<boolean>(false);
  title = input<string>('');
  size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  showCloseButton = input<boolean>(true);

  // Outputs
  closed = output<void>();

  /**
   * Close modal
   */
  close(): void {
    this.closed.emit();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  /**
   * Get modal size classes
   */
  getSizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'max-w-md';
      case 'md':
        return 'max-w-lg';
      case 'lg':
        return 'max-w-2xl';
      case 'xl':
        return 'max-w-4xl';
      default:
        return 'max-w-lg';
    }
  }
}
