import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { FileText, Shield, CheckCircle, User, AlertTriangle, Edit, Mail } from '../../icons/lucide-icons';

@Component({
  selector: 'app-terms-of-service-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe, BaseModal],
  templateUrl: './terms-of-service-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServiceModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly FileTextIcon = FileText;
  readonly ShieldIcon = Shield;
  readonly CheckCircleIcon = CheckCircle;
  readonly UserIcon = User;
  readonly AlertTriangleIcon = AlertTriangle;
  readonly EditIcon = Edit;
  readonly MailIcon = Mail;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'termsOfService.title',
    icon: this.FileTextIcon
  };

  onClose(): void {
    this.dialogRef.close();
  }
}
