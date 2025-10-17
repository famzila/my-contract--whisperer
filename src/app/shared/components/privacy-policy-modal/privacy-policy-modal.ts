import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { Shield, Lock, Eye, EyeOff } from '../../icons/lucide-icons';
import { Notice } from '../notice/notice';

@Component({
  selector: 'app-privacy-policy-modal',
  imports: [LucideAngularModule, TranslatePipe, BaseModal, Notice],
  templateUrl: './privacy-policy-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyModal {
  private dialogRef = inject(DialogRef);

  // Icons for content
  readonly ShieldIcon = Shield;
  readonly LockIcon = Lock;
  readonly EyeIcon = Eye;
  readonly EyeOffIcon = EyeOff;

  // Base modal configuration
  readonly modalConfig: BaseModalConfig = {
    titleKey: 'privacyPolicy.title',
    icon: this.ShieldIcon
  };

  onClose(): void {
    this.dialogRef.close();
  }
}
