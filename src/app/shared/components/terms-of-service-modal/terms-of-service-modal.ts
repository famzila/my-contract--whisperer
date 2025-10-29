import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { FileText, Shield, CircleCheckBig, User, TriangleAlert, SquarePen, Mail } from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

@Component({
  selector: 'app-terms-of-service-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Notice],
  templateUrl: './terms-of-service-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfServiceModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly FileTextIcon = FileText;
  readonly ShieldIcon = Shield;
  readonly CheckCircleIcon = CircleCheckBig;
  readonly UserIcon = User;
  readonly TriangleAlertIcon = TriangleAlert;
  readonly EditIcon = SquarePen;
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
