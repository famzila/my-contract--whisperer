import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { X, FileText, Shield, CheckCircle, User, AlertTriangle, Edit, Mail } from '../../icons/lucide-icons';

@Component({
  selector: 'app-terms-of-service-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe],
  templateUrl: './terms-of-service-modal.html',
  styleUrl: './terms-of-service-modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServiceModal {
  isOpen = input<boolean>(false);
  close = output<void>();

  readonly XIcon = X;
  readonly FileTextIcon = FileText;
  readonly ShieldIcon = Shield;
  readonly CheckCircleIcon = CheckCircle;
  readonly UserIcon = User;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly EditIcon = Edit;
  readonly MailIcon = Mail;

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }
}
