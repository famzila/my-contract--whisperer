import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { DialogRef } from '@angular/cdk/dialog';
import { BaseModal, BaseModalConfig } from '../base-modal/base-modal';
import { Shield, Lock, Eye, EyeOff } from '../../icons/lucide-icons';

@Component({
  selector: 'app-privacy-policy-modal',
  imports: [CommonModule, LucideAngularModule, TranslatePipe, BaseModal],
  templateUrl: './privacy-policy-modal.html',
  styleUrl: './privacy-policy-modal.css',
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
