import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { X, Shield, Lock, Eye, EyeOff } from '../../icons/lucide-icons';

@Component({
  selector: 'app-privacy-policy-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './privacy-policy-modal.html',
  styleUrl: './privacy-policy-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyModal {
  isOpen = input<boolean>(false);
  close = output<void>();

  readonly XIcon = X;
  readonly ShieldIcon = Shield;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
